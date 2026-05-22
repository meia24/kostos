import { describe, expect, it } from 'vitest';
import { scopeExpenses, suggestTripIdForDate } from './trips';
import type { Expense, Trip } from './types';

const expenseAt = (id: string, date: number, tripId?: string): Expense => ({
	id,
	payments: [],
	amount: 100,
	currency: 'EUR',
	date,
	splitMode: 'even',
	splits: [],
	createdAt: date,
	createdBy: 'm1',
	tripId
});

describe('scopeExpenses', () => {
	const all = [
		expenseAt('a', 1, 't1'),
		expenseAt('b', 2, 't2'),
		expenseAt('c', 3, undefined),
		expenseAt('d', 4, 't1')
	];

	it('returns everything when selection is null', () => {
		expect(scopeExpenses(all, null)).toHaveLength(4);
	});

	it('filters to expenses matching the tripId', () => {
		expect(scopeExpenses(all, 't1').map((e) => e.id)).toEqual(['a', 'd']);
	});

	it('excludes untagged expenses from any trip scope', () => {
		expect(scopeExpenses(all, 't2').map((e) => e.id)).toEqual(['b']);
	});
});

describe('suggestTripIdForDate', () => {
	const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

	const trips: Trip[] = [
		{
			id: 'lisbon',
			name: 'Lisbon',
			emoji: '🏖',
			startDate: day(2026, 6, 14),
			endDate: day(2026, 6, 17),
			createdAt: 0
		},
		{
			id: 'open',
			name: 'Open trip',
			emoji: '🌍',
			startDate: day(2026, 6, 1),
			createdAt: 0
		}
	];

	it('matches a date inside a closed range', () => {
		expect(suggestTripIdForDate(trips, day(2026, 6, 15))).toBe('lisbon');
	});

	it('matches open-ended trips when after their start', () => {
		expect(suggestTripIdForDate(trips, day(2026, 6, 30))).toBe('open');
	});

	it('returns null for dates outside every trip range', () => {
		expect(suggestTripIdForDate(trips, day(2026, 5, 1))).toBeNull();
	});

	it('picks the most recently started trip when multiple match', () => {
		const overlap: Trip[] = [
			{ id: 'older', name: '', emoji: '', startDate: day(2026, 6, 1), createdAt: 0 },
			{ id: 'newer', name: '', emoji: '', startDate: day(2026, 6, 10), createdAt: 0 }
		];
		expect(suggestTripIdForDate(overlap, day(2026, 6, 20))).toBe('newer');
	});

	it('ignores closed trips', () => {
		const closed: Trip[] = [
			{
				id: 'past',
				name: '',
				emoji: '',
				startDate: day(2026, 6, 1),
				endDate: day(2026, 12, 31),
				closedAt: day(2027, 1, 1),
				createdAt: 0
			}
		];
		expect(suggestTripIdForDate(closed, day(2026, 6, 15))).toBeNull();
	});
});
