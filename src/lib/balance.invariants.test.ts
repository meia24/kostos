/* Property-based checks: hammer the money invariants over hundreds of random ledgers.
 * A deterministic PRNG (seeded) keeps failures reproducible. The invariants that must
 * never break, no matter the split modes, payers, or currencies:
 *   - each expense's shares sum exactly to its amount
 *   - the whole ledger nets to exactly zero (closed system)
 *   - the settlement plan zeroes every balance, never tells anyone to pay themselves,
 *     uses positive amounts, and stays within n-1 transfers
 */

import { describe, expect, it } from 'vitest';
import { computeBalances, expenseShares, planSettlements, splitEvenly } from './balance';
import { scaleToTotal } from './currency-convert';
import type { Expense, ExpenseSplit, Member, SplitMode } from './types';

function mulberry32(seed: number): () => number {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const POOL: Member[] = Array.from({ length: 6 }, (_, i) => ({
	id: `m${i}`,
	name: `M${i}`,
	createdAt: 0
}));
const CURRENCIES = ['EUR', 'USD', 'JPY', 'GBP'];
const BASE = 'EUR';
const RUNS = 500;

function buildLedger(rand: () => number): { members: Member[]; expenses: Expense[] } {
	const members = POOL.slice(0, 2 + Math.floor(rand() * 5)); // 2..6
	const expenseCount = 1 + Math.floor(rand() * 12);
	const expenses: Expense[] = [];

	for (let e = 0; e < expenseCount; e++) {
		const amount = 1 + Math.floor(rand() * 200000);
		const shuffled = [...members].sort(() => rand() - 0.5);
		const involved = shuffled.slice(0, 1 + Math.floor(rand() * members.length));

		const pick = rand();
		const splitMode: SplitMode = pick < 0.34 ? 'even' : pick < 0.67 ? 'shares' : 'amount';
		const splits: ExpenseSplit[] = involved.map((m) => {
			if (splitMode === 'shares') return { memberId: m.id, shares: 1 + Math.floor(rand() * 5) };
			if (splitMode === 'amount') return { memberId: m.id, amount: Math.floor(rand() * amount) };
			return { memberId: m.id };
		});

		// payers always sum to the amount, the precondition real expenses satisfy
		const payerCount = 1 + Math.floor(rand() * Math.min(3, members.length));
		const portions = splitEvenly(amount, payerCount);
		const payments = shuffled
			.slice(0, payerCount)
			.map((m, i) => ({ memberId: m.id, amount: portions[i] }));

		const currency = CURRENCIES[Math.floor(rand() * CURRENCIES.length)];
		const foreign = currency !== BASE;
		expenses.push({
			id: `e${e}`,
			payments,
			amount,
			currency,
			exchangeRate: foreign ? 0.2 + rand() * 4 : undefined,
			date: 0,
			splitMode,
			splits,
			createdAt: 0,
			createdBy: payments[0].memberId
		});
	}

	return { members, expenses };
}

describe('balance invariants (fuzz)', () => {
	it('shares sum to the expense amount and the ledger nets to zero', () => {
		for (let seed = 1; seed <= RUNS; seed++) {
			const { members, expenses } = buildLedger(mulberry32(seed));
			for (const e of expenses) {
				const sum = [...expenseShares(e).values()].reduce((a, b) => a + b, 0);
				expect(sum, `shares sum, seed ${seed}, expense ${e.id}`).toBe(e.amount);
			}
			const total = computeBalances(members, expenses, BASE).reduce((a, b) => a + b.net, 0);
			expect(total, `ledger net, seed ${seed}`).toBe(0);
		}
	});

	it('settlement plans fully zero the ledger with valid transfers', () => {
		for (let seed = 1; seed <= RUNS; seed++) {
			const { members, expenses } = buildLedger(mulberry32(seed));
			const balances = computeBalances(members, expenses, BASE);
			const plan = planSettlements(balances);
			const nonzero = balances.filter((b) => b.net !== 0).length;

			expect(plan.length, `plan size, seed ${seed}`).toBeLessThanOrEqual(Math.max(0, nonzero - 1));

			const ledger = new Map(balances.map((b) => [b.memberId, b.net]));
			for (const t of plan) {
				expect(t.from, `self-pay, seed ${seed}`).not.toBe(t.to);
				expect(t.amount, `positive transfer, seed ${seed}`).toBeGreaterThan(0);
				ledger.set(t.from, (ledger.get(t.from) ?? 0) + t.amount);
				ledger.set(t.to, (ledger.get(t.to) ?? 0) - t.amount);
			}
			for (const [id, net] of ledger) expect(net, `settled net ${id}, seed ${seed}`).toBe(0);
		}
	});
});

describe('scaleToTotal invariants (fuzz)', () => {
	it('always sums to the target and never goes negative for non-negative input', () => {
		for (let seed = 1; seed <= RUNS; seed++) {
			const rand = mulberry32(seed);
			const parts = Array.from({ length: 1 + Math.floor(rand() * 8) }, () =>
				Math.floor(rand() * 5000)
			);
			const target = Math.floor(rand() * 200000);
			const out = scaleToTotal(parts, target);
			expect(out.reduce((a, b) => a + b, 0), `sum, seed ${seed}`).toBe(target);
			for (const v of out) expect(v).toBeGreaterThanOrEqual(0);
		}
	});
});
