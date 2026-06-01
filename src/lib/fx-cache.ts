/* Per-device exchange-rate cache (localStorage).
 *
 * Rates are already frozen onto each expense, so this only speeds up prefilling a new
 * foreign-currency expense and lets it work offline. Cache-first within a freshness window;
 * on a miss it fetches and stores; offline or on failure it falls back to the last known
 * rate, flagged stale so the UI can say so. */

import { fetchRate } from './fx';

const KEY = 'kostos:fx';
const TTL_MS = 12 * 60 * 60 * 1000;

type Entry = { rate: number; at: number };

function readAll(): Record<string, Entry> {
	if (typeof localStorage === 'undefined') return {};
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as Record<string, Entry>) : {};
	} catch {
		return {};
	}
}

function writeAll(map: Record<string, Entry>): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(map));
	} catch {
		// quota or private mode; the cache is best-effort
	}
}

const pairKey = (from: string, to: string) => `${from}>${to}`;

export function getCachedRate(from: string, to: string): Entry | null {
	return readAll()[pairKey(from, to)] ?? null;
}

export function setCachedRate(from: string, to: string, rate: number): void {
	const all = readAll();
	all[pairKey(from, to)] = { rate, at: Date.now() };
	writeAll(all);
}

export type ResolvedRate = { rate: number; at: number; source: 'fresh' | 'live' | 'stale' };

/** Cache-first rate resolution. A fresh cache hit returns with no network call; otherwise it
 *  fetches and caches; on failure (offline, unsupported currency) it falls back to the last
 *  known rate marked `stale`. `force` skips the freshness window for an explicit "fetch now".
 *  Returns null only when there is no cached value and the fetch failed. */
export async function resolveRate(
	from: string,
	to: string,
	force = false
): Promise<ResolvedRate | null> {
	if (from === to) return { rate: 1, at: Date.now(), source: 'fresh' };
	const cached = getCachedRate(from, to);
	if (!force && cached && Date.now() - cached.at < TTL_MS) {
		return { rate: cached.rate, at: cached.at, source: 'fresh' };
	}
	const live = await fetchRate(from, to);
	if (live != null) {
		setCachedRate(from, to, live);
		return { rate: live, at: Date.now(), source: 'live' };
	}
	if (cached) return { rate: cached.rate, at: cached.at, source: 'stale' };
	return null;
}
