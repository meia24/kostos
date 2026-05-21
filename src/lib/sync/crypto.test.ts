import { describe, expect, it } from 'vitest';
import { decryptPayload, deriveKey, encryptPayload } from './crypto';

function secretFromSeed(seed: number): string {
	const bytes = new Uint8Array(32);
	for (let i = 0; i < bytes.length; i++) bytes[i] = (seed + i * 7) & 0xff;
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const fakeSecret = () => secretFromSeed(0);

describe('AES-GCM crypto', () => {
	it('round-trips a payload', async () => {
		const key = await deriveKey(fakeSecret());
		const plaintext = new TextEncoder().encode('hello kostos');
		const encrypted = await encryptPayload(key, plaintext);
		const decrypted = await decryptPayload(key, encrypted);
		expect(new TextDecoder().decode(decrypted)).toBe('hello kostos');
	});

	it('emits a different IV per encryption of the same plaintext', async () => {
		const key = await deriveKey(fakeSecret());
		const plaintext = new TextEncoder().encode('repeat me');
		const a = await encryptPayload(key, plaintext);
		const b = await encryptPayload(key, plaintext);
		expect(a.length).toBe(b.length);
		// IV (first 12 bytes) must differ across encryptions for AES-GCM safety
		const ivA = a.slice(0, 12);
		const ivB = b.slice(0, 12);
		expect(Buffer.from(ivA).equals(Buffer.from(ivB))).toBe(false);
	});

	it('rejects decryption with a wrong key', async () => {
		const key = await deriveKey(secretFromSeed(0));
		const other = await deriveKey(secretFromSeed(31));
		const encrypted = await encryptPayload(key, new TextEncoder().encode('secret'));
		await expect(decryptPayload(other, encrypted)).rejects.toThrow();
	});

	it('rejects payloads shorter than the IV + tag', async () => {
		const key = await deriveKey(fakeSecret());
		await expect(decryptPayload(key, new Uint8Array(20))).rejects.toThrow();
	});
});
