/* Wire framing for the encrypted sync transport.
 *
 * Each plaintext is `magic (4 bytes) | type (1 byte) | body`. The magic lets a
 * peer tell a sync-protocol message from a bare Y update, which is what the old
 * pre-handshake clients sent. Anything without the magic is treated as one of
 * those legacy updates, so old and new clients still interoperate during a
 * rollout. A legacy update colliding with a 4-byte magic is ~1 in 2^32.
 *
 * The body is still the only thing that gets encrypted by the caller; this module
 * just frames/parses the plaintext.
 */

export const MSG_STEP1 = 1; // body = state vector ("here is everything I have")
export const MSG_UPDATE = 2; // body = a Y update (a step-2 reply, or a live edit)

const MAGIC = Uint8Array.from([0x4b, 0x4f, 0x53, 0x32]); // "KOS2"
const HEADER_LEN = MAGIC.length + 1;

export type ParsedMessage =
	| { kind: 'step1'; body: Uint8Array }
	| { kind: 'update'; body: Uint8Array }
	| { kind: 'legacy'; body: Uint8Array };

export function frame(type: number, body: Uint8Array): Uint8Array {
	const out = new Uint8Array(HEADER_LEN + body.length);
	out.set(MAGIC, 0);
	out[MAGIC.length] = type;
	out.set(body, HEADER_LEN);
	return out;
}

export function parse(plain: Uint8Array): ParsedMessage {
	if (plain.length >= HEADER_LEN && hasMagic(plain)) {
		const type = plain[MAGIC.length];
		const body = plain.subarray(HEADER_LEN);
		if (type === MSG_STEP1) return { kind: 'step1', body };
		if (type === MSG_UPDATE) return { kind: 'update', body };
	}
	return { kind: 'legacy', body: plain };
}

function hasMagic(buf: Uint8Array): boolean {
	for (let i = 0; i < MAGIC.length; i++) {
		if (buf[i] !== MAGIC[i]) return false;
	}
	return true;
}
