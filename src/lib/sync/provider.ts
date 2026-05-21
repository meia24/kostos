/* Encrypted Y.Doc sync provider.
 *
 * Local Y.Doc updates get encrypted with AES-GCM and pushed over a WebSocket to
 * the Kostos relay. Updates coming back from the relay are decrypted and applied
 * with origin 'remote' so we don't echo them back. The provider auto-reconnects
 * with exponential backoff up to 30 s.
 *
 * The server sees only ciphertext; the AES key never leaves the client, since it
 * is derived from the secret half of the project token, which stays in the URL
 * fragment + localStorage.
 */

import * as Y from 'yjs';
import { browser } from '$app/environment';
import { decryptPayload, deriveKey, encryptPayload } from './crypto';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

const REMOTE_ORIGIN = Symbol('kostos-sync-remote');

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

	constructor(doc: Y.Doc, url: string, roomId: string, secret: string) {
		this.doc = doc;
		this.url = url;
		this.roomId = roomId;
		this.key = deriveKey(secret);
		this.updateListener = (update, origin) => this.onLocalUpdate(update, origin);
		doc.on('update', this.updateListener);
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

		ws.onopen = async () => {
			this.setStatus('connected');
			this.reconnectDelay = 1000;
			try {
				const state = Y.encodeStateAsUpdate(this.doc);
				const enc = await encryptPayload(await this.key, state);
				ws.send(enc as BufferSource);
			} catch {
				// ignore — peer will rebuild from our update stream
			}
		};

		ws.onmessage = async (event) => {
			try {
				const data = new Uint8Array(event.data as ArrayBuffer);
				const plain = await decryptPayload(await this.key, data);
				Y.applyUpdate(this.doc, plain, REMOTE_ORIGIN);
			} catch {
				// drop malformed / wrong-key packets silently
			}
		};

		ws.onclose = () => {
			this.ws = null;
			if (this.destroyed) return;
			this.setStatus('reconnecting');
			setTimeout(() => this.connect(), this.reconnectDelay);
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
		};

		ws.onerror = () => {
			// onclose handles the retry
		};
	}

	private async onLocalUpdate(update: Uint8Array, origin: unknown): Promise<void> {
		if (origin === REMOTE_ORIGIN) return;
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		try {
			const enc = await encryptPayload(await this.key, update);
			this.ws.send(enc as BufferSource);
		} catch {
			// ignore; reconnect path will resync state on next open
		}
	}
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
