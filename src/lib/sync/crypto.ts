/* AES-GCM helpers for the encrypted sync transport.
 *
 * The project secret (base64url, 32 bytes / 256 bits) is imported as an AES-GCM key.
 * Each encrypted payload is `iv (12 bytes) | ciphertext+tag`. IVs are random per message,
 * which is required for AES-GCM safety. Server sees only opaque ciphertext.
 */

const KEY_USAGES: KeyUsage[] = ['encrypt', 'decrypt'];

export async function deriveKey(secretBase64Url: string): Promise<CryptoKey> {
	const raw = base64UrlDecode(secretBase64Url);
	return crypto.subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, KEY_USAGES);
}

export async function encryptPayload(key: CryptoKey, plaintext: Uint8Array): Promise<Uint8Array> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext as BufferSource)
	);
	const out = new Uint8Array(iv.length + ciphertext.length);
	out.set(iv, 0);
	out.set(ciphertext, iv.length);
	return out;
}

export async function decryptPayload(key: CryptoKey, payload: Uint8Array): Promise<Uint8Array> {
	if (payload.length < 12 + 16) throw new Error('payload too short');
	const iv = payload.slice(0, 12);
	const ciphertext = payload.slice(12);
	return new Uint8Array(
		await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext as BufferSource)
	);
}

function base64UrlDecode(input: string): Uint8Array {
	const normalised = input.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);
	const bin = atob(padded);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}
