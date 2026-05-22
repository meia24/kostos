/* Trip selection + scoping helpers.
 *
 * The current trip selection is per-device, not synced: different members may want to
 * focus on different trips at the same time. It lives in localStorage keyed by roomId,
 * with `''` meaning "All".
 *
 * Pure helpers (`scopeExpenses`, `suggestTripIdForDate`) don't touch storage and are easy
 * to test. The localStorage reads/writes are thin wrappers.
 */

import { browser } from '$app/environment';
import type { Expense, Trip } from './types';

const SELECTION_KEY = (roomId: string) => `kostos:trip_for:${roomId}`;
const INTRO_DISMISSED_KEY = (roomId: string) => `kostos:trips_intro_dismissed:${roomId}`;

/** Read the saved selection for a room. Returns null for "All" or unknown. */
export function readTripSelection(roomId: string): string | null {
	if (!browser || !roomId) return null;
	try {
		const v = localStorage.getItem(SELECTION_KEY(roomId));
		return v && v.length > 0 ? v : null;
	} catch {
		return null;
	}
}

/** Persist a selection. Pass null to clear (back to "All"). */
export function writeTripSelection(roomId: string, tripId: string | null): void {
	if (!browser || !roomId) return;
	try {
		if (tripId === null) localStorage.removeItem(SELECTION_KEY(roomId));
		else localStorage.setItem(SELECTION_KEY(roomId), tripId);
	} catch {
		// quota / private-mode: silently ignore
	}
}

/** Filter expenses to those matching a tripId selection.
 *  null selection → return everything (the "All" bucket). */
export function scopeExpenses(expenses: Expense[], tripId: string | null): Expense[] {
	if (tripId === null) return expenses;
	return expenses.filter((e) => e.tripId === tripId);
}

/** Find the trip whose date range contains the given timestamp. Open-ended trips
 *  (no endDate) match any date >= startDate. Returns null when none qualify. If
 *  multiple match (overlapping trips), the most recently started wins. */
export function suggestTripIdForDate(trips: Trip[], dateMs: number): string | null {
	const day = startOfDay(dateMs);
	const active = trips.filter((t) => {
		if (t.closedAt !== undefined) return false;
		if (startOfDay(t.startDate) > day) return false;
		if (t.endDate === undefined) return true;
		return day <= startOfDay(t.endDate);
	});
	if (active.length === 0) return null;
	active.sort((a, b) => b.startDate - a.startDate);
	return active[0].id;
}

function startOfDay(ms: number): number {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

/** Has the user dismissed the "trips" intro card for this project? */
export function readTripsIntroDismissed(roomId: string): boolean {
	if (!browser || !roomId) return false;
	try {
		return localStorage.getItem(INTRO_DISMISSED_KEY(roomId)) === '1';
	} catch {
		return false;
	}
}

export function dismissTripsIntro(roomId: string): void {
	if (!browser || !roomId) return;
	try {
		localStorage.setItem(INTRO_DISMISSED_KEY(roomId), '1');
	} catch {
		// quota / private mode: silently ignore
	}
}
