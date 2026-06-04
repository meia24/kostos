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
