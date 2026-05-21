/// <reference types="@cloudflare/workers-types" />
/* Cloudflare Worker entry.
 *
 * Static assets (the SvelteKit static build) come out of env.ASSETS.
 * WebSocket sync hits /sync/<roomId> and gets routed to a SyncRoom DO instance.
 */

export { SyncRoom } from '../src/lib/server/sync-do';

type Env = {
	ASSETS: { fetch: (req: Request) => Promise<Response> };
	SYNC_ROOM: DurableObjectNamespace;
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname.startsWith('/sync/')) {
			if (request.headers.get('Upgrade') !== 'websocket') {
				return new Response('Expected WebSocket', { status: 426 });
			}
			const roomId = decodeURIComponent(url.pathname.slice('/sync/'.length)).toUpperCase();
			if (!roomId) return new Response('Missing roomId', { status: 400 });
			const id = env.SYNC_ROOM.idFromName(roomId);
			return env.SYNC_ROOM.get(id).fetch(request);
		}

		return env.ASSETS.fetch(request);
	}
} satisfies ExportedHandler<Env>;
