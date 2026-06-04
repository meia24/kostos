import { describe, expect, it } from 'vitest';
import { diffExpense } from './activity-diff';
import type { Expense } from '$lib/types';

function expense(over: Partial<Expense> = {}): Expense {
	return {
		id: 'e1',
		payments: [{ memberId: 'a', amount: 1000 }],
		amount: 1000,
		currency: 'EUR',
		date: 1000,
		splitMode: 'even',
		splits: [{ memberId: 'a' }, { memberId: 'b' }],
		createdAt: 0,
		createdBy: 'a',
		...over
	};
}

describe('diffExpense', () => {
	it('reports nothing when unchanged', () => {
		expect(diffExpense(expense(), expense())).toEqual([]);
	});

	it('captures an amount change with both currencies', () => {
		expect(diffExpense(expense(), expense({ amount: 1500 }))).toEqual([
			{ kind: 'amount', from: 1000, to: 1500, fromCurrency: 'EUR', toCurrency: 'EUR' }
		]);
	});

	it('keeps the title change raw, not pre-formatted', () => {
		expect(diffExpense(expense({ description: 'Taxi' }), expense({ description: 'Cab' }))).toEqual([
			{ kind: 'text', from: 'Taxi', to: 'Cab' }
		]);
	});

	it('carries member ids when the payer set changes', () => {
		expect(
			diffExpense(expense(), expense({ payments: [{ memberId: 'b', amount: 1000 }] }))
		).toEqual([{ kind: 'paidBy', from: ['a'], to: ['b'] }]);
	});

	it('omits ids when only the per-payer amounts move', () => {
		const prev = expense({
			payments: [
				{ memberId: 'a', amount: 600 },
				{ memberId: 'b', amount: 400 }
			]
		});
		const next = expense({
			payments: [
				{ memberId: 'a', amount: 500 },
				{ memberId: 'b', amount: 500 }
			]
		});
		expect(diffExpense(prev, next)).toEqual([{ kind: 'paidBy' }]);
	});

	it('captures a split mode change', () => {
		expect(diffExpense(expense(), expense({ splitMode: 'shares' }))).toEqual([
			{ kind: 'split', from: 'even', to: 'shares' }
		]);
	});

	it('flags a split detail change when the mode is unchanged', () => {
		expect(diffExpense(expense(), expense({ splits: [{ memberId: 'a' }] }))).toEqual([
			{ kind: 'split' }
		]);
	});

	it('does not double-count payment/split cascades when the total changes', () => {
		// single payer, even split; the form tracks the payer amount to the new total
		const prev = expense({
			amount: 4200,
			description: 'Lunch',
			payments: [{ memberId: 'a', amount: 4200 }],
			splits: [{ memberId: 'a' }, { memberId: 'b' }]
		});
		const next = expense({
			amount: 10000,
			description: 'Lunch 2',
			payments: [{ memberId: 'a', amount: 10000 }],
			splits: [{ memberId: 'a' }, { memberId: 'b' }]
		});
		expect(diffExpense(prev, next)).toEqual([
			{ kind: 'amount', from: 4200, to: 10000, fromCurrency: 'EUR', toCurrency: 'EUR' },
			{ kind: 'text', from: 'Lunch', to: 'Lunch 2' }
		]);
	});

	it('suppresses split values that recompute from a changed total', () => {
		const prev = expense({
			amount: 1000,
			splitMode: 'amount',
			payments: [{ memberId: 'a', amount: 1000 }],
			splits: [
				{ memberId: 'a', amount: 500 },
				{ memberId: 'b', amount: 500 }
			]
		});
		const next = expense({
			amount: 1500,
			splitMode: 'amount',
			payments: [{ memberId: 'a', amount: 1500 }],
			splits: [
				{ memberId: 'a', amount: 750 },
				{ memberId: 'b', amount: 750 }
			]
		});
		expect(diffExpense(prev, next)).toEqual([
			{ kind: 'amount', from: 1000, to: 1500, fromCurrency: 'EUR', toCurrency: 'EUR' }
		]);
	});

	it('reports a split value change when the total is unchanged', () => {
		const prev = expense({
			splitMode: 'amount',
			splits: [
				{ memberId: 'a', amount: 500 },
				{ memberId: 'b', amount: 500 }
			]
		});
		const next = expense({
			splitMode: 'amount',
			splits: [
				{ memberId: 'a', amount: 700 },
				{ memberId: 'b', amount: 300 }
			]
		});
		expect(diffExpense(prev, next)).toEqual([{ kind: 'split' }]);
	});

	it('ignores a time-of-day change within the same day', () => {
		const day = Date.UTC(2026, 5, 4);
		expect(diffExpense(expense({ date: day }), expense({ date: day + 3600_000 }))).toEqual([]);
	});

	it('ignores reordering of payers', () => {
		const prev = expense({
			payments: [
				{ memberId: 'a', amount: 600 },
				{ memberId: 'b', amount: 400 }
			]
		});
		const next = expense({
			payments: [
				{ memberId: 'b', amount: 400 },
				{ memberId: 'a', amount: 600 }
			]
		});
		expect(diffExpense(prev, next)).toEqual([]);
	});
});
