import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRate } from './fx-cache';

function makeStorage(): Storage {
	const m = new Map<string, string>();
	return {
		getItem: (k: string) => m.get(k) ?? null,
		setItem: (k: string, v: string) => {
			m.set(k, v);
		},
		removeItem: (k: string) => {
			m.delete(k);
		},
		clear: () => m.clear(),
		key: () => null,
		get length() {
			return m.size;
		}
	} as Storage;
}

function seedCache(from: string, to: string, rate: number, at: number) {
	localStorage.setItem('kostos:fx', JSON.stringify({ [`${from}>${to}`]: { rate, at } }));
}

function stubFetch(impl: () => Promise<unknown>) {
	vi.stubGlobal('fetch', vi.fn(impl));
}

beforeEach(() => {
	vi.stubGlobal('localStorage', makeStorage());
});
afterEach(() => vi.unstubAllGlobals());

describe('resolveRate', () => {
	it('returns 1 for the same currency without cache or network', async () => {
		const f = vi.fn();
		vi.stubGlobal('fetch', f);
		const r = await resolveRate('EUR', 'EUR');
		expect(r).toMatchObject({ rate: 1, source: 'fresh' });
		expect(f).not.toHaveBeenCalled();
	});

	it('uses a fresh cache hit without fetching', async () => {
		seedCache('USD', 'EUR', 0.9, Date.now());
		const f = vi.fn();
		vi.stubGlobal('fetch', f);
		const r = await resolveRate('USD', 'EUR');
		expect(r).toMatchObject({ rate: 0.9, source: 'fresh' });
		expect(f).not.toHaveBeenCalled();
	});

	it('fetches and caches on a miss, then serves the next call from cache', async () => {
		stubFetch(async () => ({
			ok: true,
			json: async () => ({ result: 'success', rates: { EUR: 0.92 } })
		}));
		const r = await resolveRate('USD', 'EUR');
		expect(r).toMatchObject({ rate: 0.92, source: 'live' });

		const f = vi.fn();
		vi.stubGlobal('fetch', f);
		const again = await resolveRate('USD', 'EUR');
		expect(again).toMatchObject({ rate: 0.92, source: 'fresh' });
		expect(f).not.toHaveBeenCalled();
	});

	it('force refetches even when the cache is fresh', async () => {
		seedCache('USD', 'EUR', 0.9, Date.now());
		stubFetch(async () => ({
			ok: true,
			json: async () => ({ result: 'success', rates: { EUR: 0.95 } })
		}));
		expect(await resolveRate('USD', 'EUR', true)).toMatchObject({ rate: 0.95, source: 'live' });
	});

	it('falls back to a stale cached rate when offline', async () => {
		const old = Date.now() - 13 * 60 * 60 * 1000;
		seedCache('USD', 'EUR', 0.88, old);
		stubFetch(async () => {
			throw new Error('offline');
		});
		expect(await resolveRate('USD', 'EUR')).toEqual({ rate: 0.88, at: old, source: 'stale' });
	});

	it('returns null when offline with nothing cached', async () => {
		stubFetch(async () => {
			throw new Error('offline');
		});
		expect(await resolveRate('USD', 'EUR')).toBeNull();
	});
});
