/* Encrypted Y.Doc sync provider.
 *
 * Sync follows the Yjs two-step handshake. On connect each peer broadcasts a sync
 * step 1 (its state vector); any peer that holds structs the sender is missing
 * replies with a step 2 (exactly that diff). Live local edits are broadcast as
 * updates. Everything from the relay is applied with origin 'remote' so we don't
 * echo it back. This is convergent: two connected peers always backfill whatever
 * the other lacks, which a one-shot full-state push could not guarantee. The
 * provider auto-reconnects with exponential backoff up to 30 s, re-running the
 * handshake on every reconnect.
 *
 * Loop-free by construction: step 1 is only ever sent proactively (on connect);
 * the only reply to a step 1 is a state update, and an update triggers nothing.
 * The reply is debounced because the relay replays history as a burst of step 1s
 * on connect, and we answer the whole burst once rather than per message.
 *
 * A "ping"/"pong" heartbeat detects half-open sockets: mobile PWAs that get
 * backgrounded or switch networks often keep readyState === OPEN while the
 * underlying connection is dead, so onclose never fires and local edits silently
 * vanish. When a pong doesn't come back we force-close to trigger a real
 * reconnect. We also probe/reconnect on `online` and on regaining tab visibility.
 *
 * The server sees only ciphertext; the AES key never leaves the client, since it
 * is derived from the secret half of the project token, which stays in the URL
 * fragment + localStorage.
 */

import * as Y from 'yjs';
import { browser } from '$app/environment';
import { decryptPayload, deriveKey, encryptPayload } from './crypto';
import { frame, parse, MSG_STEP1, MSG_UPDATE } from './protocol';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

const REMOTE_ORIGIN = Symbol('kostos-sync-remote');

const PING_INTERVAL_MS = 20_000;
const PONG_TIMEOUT_MS = 10_000;
const PULL_DEBOUNCE_MS = 250;

export class EncryptedSyncProvider {
	private doc: Y.Doc;
	private url: string;
	private roomId: string;
	private key: Promise<CryptoKey>;
	private ws: WebSocket | null = null;
	private reconnectDelay = 1000;
	private destroyed = false;
	private updateListener: (update: Uint8Array, origin: unknown) => void;
	private listeners = new Set<(status: ConnectionStatus) => void>();
	private currentStatus: ConnectionStatus = 'idle';
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private pongTimer: ReturnType<typeof setTimeout> | null = null;
	private pullTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(doc: Y.Doc, url: string, roomId: string, secret: string) {
		this.doc = doc;
		this.url = url;
		this.roomId = roomId;
		this.key = deriveKey(secret);
		this.updateListener = (update, origin) => this.onLocalUpdate(update, origin);
		doc.on('update', this.updateListener);
		if (typeof window !== 'undefined') {
			window.addEventListener('online', this.handleWake);
			document.addEventListener('visibilitychange', this.handleVisibility);
		}
		this.connect();
	}

	get status(): ConnectionStatus {
		return this.currentStatus;
	}

	onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
		this.listeners.add(listener);
		listener(this.currentStatus);
		return () => this.listeners.delete(listener);
	}

	destroy(): void {
		this.destroyed = true;
		this.doc.off('update', this.updateListener);
		this.listeners.clear();
		this.stopHeartbeat();
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.pullTimer) {
			clearTimeout(this.pullTimer);
			this.pullTimer = null;
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.handleWake);
			document.removeEventListener('visibilitychange', this.handleVisibility);
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	private setStatus(status: ConnectionStatus): void {
		if (this.currentStatus === status) return;
		this.currentStatus = status;
		for (const l of this.listeners) l(status);
	}

	private connect(): void {
		if (this.destroyed) return;
		this.setStatus('connecting');
		const ws = new WebSocket(`${this.url}/${encodeURIComponent(this.roomId)}`);
		ws.binaryType = 'arraybuffer';
		this.ws = ws;

		ws.onopen = () => {
			this.setStatus('connected');
			this.reconnectDelay = 1000;
			this.startHeartbeat();
			this.sendStep1();
		};

		ws.onmessage = async (event) => {
			if (typeof event.data === 'string') {
				if (event.data === 'pong') this.clearPongTimer();
				return;
			}
			try {
				const data = new Uint8Array(event.data as ArrayBuffer);
				const plain = await decryptPayload(await this.key, data);
				const msg = parse(plain);
				if (msg.kind === 'step1') {
					this.scheduleStateReply();
				} else {
					// state reply, live update, or a legacy bare update
					Y.applyUpdate(this.doc, msg.body, REMOTE_ORIGIN);
				}
			} catch {
				// drop malformed / wrong-key packets silently
			}
		};

		ws.onclose = () => {
			this.ws = null;
			this.stopHeartbeat();
			if (this.destroyed) return;
			this.setStatus('reconnecting');
			this.scheduleReconnect();
		};

		ws.onerror = () => {
			// onclose handles the retry
		};
	}

	private onLocalUpdate(update: Uint8Array, origin: unknown): void {
		if (origin === REMOTE_ORIGIN) return;
		// fires for genuine edits and for the batch y-indexeddb applies on load,
		// so an offline backlog gets pushed the moment a connection is live
		void this.sendFrame(MSG_UPDATE, update);
	}

	private sendStep1(): void {
		void this.sendFrame(MSG_STEP1, Y.encodeStateVector(this.doc));
	}

	private scheduleStateReply(): void {
		// a peer advertised its state, so send ours. full state is a superset of any
		// diff and carries the delete set, so it heals missing inserts and missing
		// deletes alike (deletions never advance the state vector). debounced so the
		// burst of step-1s the relay replays on connect is answered just once.
		if (this.pullTimer) return;
		this.pullTimer = setTimeout(() => {
			this.pullTimer = null;
			void this.sendFrame(MSG_UPDATE, Y.encodeStateAsUpdate(this.doc));
		}, PULL_DEBOUNCE_MS);
	}

	private async sendFrame(type: number, body: Uint8Array): Promise<void> {
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		try {
			const enc = await encryptPayload(await this.key, frame(type, body));
			ws.send(enc as BufferSource);
		} catch {
			// ignore; the next reconnect re-runs the step-1 handshake
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer) return;
		const delay = this.reconnectDelay;
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, delay);
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval(() => this.sendPing(), PING_INTERVAL_MS);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
		this.clearPongTimer();
	}

	private clearPongTimer(): void {
		if (this.pongTimer) {
			clearTimeout(this.pongTimer);
			this.pongTimer = null;
		}
	}

	/** Probe liveness: a pong clears the timer, silence force-closes the zombie. */
	private sendPing(): void {
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		if (this.pongTimer) return; // a ping is already in flight
		try {
			ws.send('ping');
		} catch {
			return;
		}
		this.pongTimer = setTimeout(() => {
			this.pongTimer = null;
			try {
				ws.close();
			} catch {
				// already gone; onclose will drive the reconnect
			}
		}, PONG_TIMEOUT_MS);
	}

	private handleWake = (): void => {
		if (this.destroyed) return;
		const ws = this.ws;
		if (ws && ws.readyState === WebSocket.OPEN) {
			// looks alive, but it may be half-open after a sleep; probe it now
			this.sendPing();
			return;
		}
		// CONNECTING settles on its own; CLOSING hands off to onclose
		if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.CLOSING)) {
			return;
		}
		// dead or absent: drop any pending backoff and reconnect immediately
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.reconnectDelay = 1000;
		this.connect();
	};

	private handleVisibility = (): void => {
		if (document.visibilityState === 'visible') this.handleWake();
	};
}

export function createSyncProvider(
	doc: Y.Doc,
	url: string | undefined,
	roomId: string,
	secret: string
): EncryptedSyncProvider | null {
	if (!browser || !url) return null;
	return new EncryptedSyncProvider(doc, url, roomId, secret);
}
