/* Exchange-rate lookup.
 *
 * Uses open.er-api.com (free, no API key, sends Access-Control-Allow-Origin: * so it works
 * from the browser). This is the only outbound third-party call in the app, so callers must
 * gate it behind the project's autoFetchRates flag and an actual currency mismatch. Returns
 * null on any failure (offline, unsupported currency, network/CORS error) so the UI falls
 * back to manual entry. Rates are "latest"; the value is frozen onto the expense at creation. */

const BASE = 'https://open.er-api.com/v6/latest';

/** Rate as "to-major-units per 1 from-major-unit", e.g. fetchRate('USD','EUR') ~= 0.92. */
export async function fetchRate(from: string, to: string): Promise<number | null> {
	if (!from || !to) return null;
	if (from === to) return 1;
	try {
		const res = await fetch(`${BASE}/${encodeURIComponent(from)}`);
		if (!res.ok) return null;
		const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
		if (data.result && data.result !== 'success') return null;
		const rate = data.rates?.[to];
		return typeof rate === 'number' && rate > 0 ? rate : null;
	} catch {
		return null;
	}
}
