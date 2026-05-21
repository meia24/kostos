/* Project-token helpers.
 *
 * A project is identified by a pair: `roomId.secret`.
 *  - `roomId` is sent to the sync server so it can route to the right Y.Doc.
 *  - `secret` is the key used to encrypt updates client-side; it must NEVER leave the client.
 *
 * The full token is shared as a URL with the secret in the fragment, e.g.
 *     https://kostos.app/join#prt-4f2k-9xba.<base64url-secret>
 * Browsers don't send `#...` in requests, so even if the share URL leaks through a referer
 * header the secret is preserved.
 *
 * The UI surfaces the short `roomId` (the design's `PRT-XXXX-XXXX` style) as a glanceable label;
 * the full URL is what users actually share.
 */

const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32-ish, ambiguity-free

export type ParsedToken = { roomId: string; secret: string };

/** Build a fresh random room id of the form `PRT-XXXX-XXXX`. */
export function generateRoomId(): string {
	const random = new Uint8Array(8);
	crypto.getRandomValues(random);
	const chars = Array.from(random, (b) => ROOM_ALPHABET[b % ROOM_ALPHABET.length]);
	return `PRT-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}`;
}

/** Build a fresh random secret as base64url-encoded 32 bytes. */
export function generateSecret(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return base64url(bytes);
}

/** Accept either `roomId.secret` or a full URL with `#roomId.secret`. */
export function parseToken(raw: string): ParsedToken | null {
	let input = raw.trim();
	if (!input) return null;

	if (input.includes('://')) {
		const hashIndex = input.indexOf('#');
		if (hashIndex === -1) return null;
		input = input.slice(hashIndex + 1);
	}

	const dot = input.indexOf('.');
	if (dot === -1) return null;

	const roomId = input.slice(0, dot).trim();
	const secret = input.slice(dot + 1).trim();
	if (!roomId || !secret) return null;
	return { roomId: roomId.toUpperCase(), secret };
}

function base64url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
