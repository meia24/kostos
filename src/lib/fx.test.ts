import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRate } from './fx';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: () => Promise<unknown>) {
	vi.stubGlobal('fetch', vi.fn(impl));
}

describe('fetchRate', () => {
	it('returns 1 for the same currency without hitting the network', async () => {
		const f = vi.fn();
		vi.stubGlobal('fetch', f);
		expect(await fetchRate('EUR', 'EUR')).toBe(1);
		expect(f).not.toHaveBeenCalled();
	});

	it('returns null for missing inputs', async () => {
		expect(await fetchRate('', 'EUR')).toBeNull();
		expect(await fetchRate('USD', '')).toBeNull();
	});

	it('returns the target rate on success', async () => {
		stubFetch(async () => ({
			ok: true,
			json: async () => ({ result: 'success', rates: { EUR: 0.92 } })
		}));
		expect(await fetchRate('USD', 'EUR')).toBe(0.92);
	});

	it('returns null when the api reports a non-success result', async () => {
		stubFetch(async () => ({
			ok: true,
			json: async () => ({ result: 'error', rates: {} })
		}));
		expect(await fetchRate('USD', 'EUR')).toBeNull();
	});

	it('returns null when the target rate is absent', async () => {
		stubFetch(async () => ({
			ok: true,
			json: async () => ({ result: 'success', rates: { GBP: 0.8 } })
		}));
		expect(await fetchRate('USD', 'EUR')).toBeNull();
	});

	it('returns null when the rate is zero or negative', async () => {
		stubFetch(async () => ({
			ok: true,
			json: async () => ({ result: 'success', rates: { EUR: 0 } })
		}));
		expect(await fetchRate('USD', 'EUR')).toBeNull();
	});

	it('returns null on a non-ok response', async () => {
		stubFetch(async () => ({ ok: false, json: async () => ({}) }));
		expect(await fetchRate('USD', 'EUR')).toBeNull();
	});

	it('returns null when the request throws', async () => {
		stubFetch(async () => {
			throw new Error('network down');
		});
		expect(await fetchRate('USD', 'EUR')).toBeNull();
	});
});
