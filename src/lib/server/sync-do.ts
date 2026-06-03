/// <reference types="@cloudflare/workers-types" />
/* Kostos sync relay as a Durable Object.
 *
 * One DO instance per roomId. Hibernating WebSockets fan messages out to every
 * peer in the same room. A capped ciphertext history is replayed to new joiners
 * so they can rebuild state without needing a live peer.
 *
 * Payloads are AES-GCM ciphertext from the client; the relay never holds the key.
 */

import { DurableObject } from 'cloudflare:workers';

const HISTORY_CAP = 1000;
const HISTORY_KEY = 'history';

type HistoryEntry = ArrayBuffer;

export class SyncRoom extends DurableObject {
	private history: HistoryEntry[] = [];
	private hydrated = false;

	constructor(ctx: DurableObjectState, env: unknown) {
		super(ctx, env as never);
		// Runtime answers client "ping" with "pong" without waking the DO, so a
		// hibernated room still keeps the heartbeat that lets clients detect a dead
		// socket. The webSocketMessage handler is never invoked for these.
		this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected WebSocket', { status: 426 });
		}

		await this.ensureHydrated();

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		this.ctx.acceptWebSocket(server);

		for (const blob of this.history) {
			try {
				server.send(blob);
			} catch {
				// peer closed before we finished replay; webSocketClose will handle it
				break;
			}
		}

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		if (typeof message === 'string') return; // we only relay binary updates

		await this.ensureHydrated();

		// fan out first so a storage hiccup can never block live delivery
		for (const peer of this.ctx.getWebSockets()) {
			if (peer === ws) continue;
			try {
				peer.send(message);
			} catch {
				// best-effort fanout; failing peers will reconnect
			}
		}

		this.history.push(message);
		while (this.history.length > HISTORY_CAP) this.history.shift();
		try {
			await this.ctx.storage.put(HISTORY_KEY, this.history);
		} catch {
			// history persistence is best-effort; replay just rebuilds from peers
		}
	}

	async webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		_wasClean: boolean
	): Promise<void> {
		try {
			ws.close(code, reason);
		} catch {
			// already closed
		}
	}

	async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
		// no-op; close handler runs after
	}

	private async ensureHydrated(): Promise<void> {
		if (this.hydrated) return;
		const stored = await this.ctx.storage.get<HistoryEntry[]>(HISTORY_KEY);
		if (stored && Array.isArray(stored)) this.history = stored;
		this.hydrated = true;
	}
}
