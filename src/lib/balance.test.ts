import { describe, expect, it } from 'vitest';
import {
	computeBalances,
	expenseShares,
	planSettlements,
	splitEvenly,
	type MemberBalance
} from './balance';
import type { Expense, Member } from './types';

function member(id: string, name = id): Member {
	return { id, name, createdAt: 0 };
}

function expense(partial: Partial<Expense> & Pick<Expense, 'amount' | 'payerId' | 'splits'>): Expense {
	return {
		id: partial.id ?? 'e1',
		payerId: partial.payerId,
		amount: partial.amount,
		currency: partial.currency ?? 'EUR',
		date: partial.date ?? 0,
		splitMode: partial.splitMode ?? 'even',
		splits: partial.splits,
		createdAt: partial.createdAt ?? 0,
		createdBy: partial.createdBy ?? partial.payerId
	};
}

function sumOf(map: Map<string, number>): number {
	let total = 0;
	for (const v of map.values()) total += v;
	return total;
}

function netZero(balances: MemberBalance[]): boolean {
	return balances.reduce((acc, b) => acc + b.net, 0) === 0;
}

describe('splitEvenly', () => {
	it('divides evenly when total is divisible', () => {
		expect(splitEvenly(900, 3)).toEqual([300, 300, 300]);
	});

	it('distributes remainder to leading parts', () => {
		expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]);
	});

	it('preserves total under irregular splits', () => {
		const parts = splitEvenly(8420, 7);
		expect(parts.reduce((a, b) => a + b, 0)).toBe(8420);
		expect(parts.length).toBe(7);
	});

	it('handles a single recipient', () => {
		expect(splitEvenly(1234, 1)).toEqual([1234]);
	});

	it('returns empty for zero parts', () => {
		expect(splitEvenly(100, 0)).toEqual([]);
	});

	it('handles negative totals symmetrically', () => {
		const parts = splitEvenly(-1000, 3);
		expect(parts.reduce((a, b) => a + b, 0)).toBe(-1000);
		expect(parts).toEqual([-334, -333, -333]);
	});
});

describe('expenseShares', () => {
	it('splits evenly across involved members', () => {
		const result = expenseShares(
			expense({
				amount: 1000,
				payerId: 'a',
				splitMode: 'even',
				splits: [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }]
			})
		);
		expect(result.get('a')).toBe(334);
		expect(result.get('b')).toBe(333);
		expect(result.get('c')).toBe(333);
		expect(sumOf(result)).toBe(1000);
	});

	it('respects amount mode with exact assignments', () => {
		const result = expenseShares(
			expense({
				amount: 2000,
				payerId: 'a',
				splitMode: 'amount',
				splits: [
					{ memberId: 'a', amount: 1500 },
					{ memberId: 'b', amount: 500 }
				]
			})
		);
		expect(result.get('a')).toBe(1500);
		expect(result.get('b')).toBe(500);
	});

	it('absorbs drift into the first split in amount mode', () => {
		const result = expenseShares(
			expense({
				amount: 2000,
				payerId: 'a',
				splitMode: 'amount',
				splits: [
					{ memberId: 'a', amount: 1499 },
					{ memberId: 'b', amount: 500 }
				]
			})
		);
		expect(result.get('a')).toBe(1500);
		expect(result.get('b')).toBe(500);
		expect(sumOf(result)).toBe(2000);
	});

	it('distributes by shares with no rounding loss', () => {
		const result = expenseShares(
			expense({
				amount: 11655,
				payerId: 'a',
				splitMode: 'shares',
				splits: [
					{ memberId: 'a', shares: 2 },
					{ memberId: 'b', shares: 2 },
					{ memberId: 'c', shares: 3 },
					{ memberId: 'd', shares: 1 },
					{ memberId: 'e', shares: 2 }
				]
			})
		);
		expect(sumOf(result)).toBe(11655);
		expect(result.get('c')).toBeGreaterThan(result.get('a')!);
		expect(result.get('d')).toBeLessThan(result.get('a')!);
	});

	it('returns an empty map when shares mode totals to zero shares', () => {
		const result = expenseShares(
			expense({
				amount: 1000,
				payerId: 'a',
				splitMode: 'shares',
				splits: [
					{ memberId: 'a', shares: 0 },
					{ memberId: 'b', shares: 0 }
				]
			})
		);
		expect(result.size).toBe(0);
	});
});

describe('computeBalances', () => {
	it('credits payer and debits each beneficiary', () => {
		const members = [member('a'), member('b'), member('c')];
		const expenses: Expense[] = [
			expense({
				amount: 900,
				payerId: 'a',
				splits: [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }]
			})
		];
		const balances = computeBalances(members, expenses);
		const byId = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
		expect(byId.a).toBe(600);
		expect(byId.b).toBe(-300);
		expect(byId.c).toBe(-300);
	});

	it('produces a net-zero ledger across many expenses', () => {
		const members = [member('a'), member('b'), member('c'), member('d')];
		const expenses: Expense[] = [
			expense({
				id: 'x1',
				amount: 8420,
				payerId: 'a',
				splitMode: 'even',
				splits: members.map((m) => ({ memberId: m.id }))
			}),
			expense({
				id: 'x2',
				amount: 4250,
				payerId: 'b',
				splitMode: 'shares',
				splits: [
					{ memberId: 'a', shares: 1 },
					{ memberId: 'b', shares: 1 },
					{ memberId: 'c', shares: 2 }
				]
			}),
			expense({
				id: 'x3',
				amount: 1500,
				payerId: 'd',
				splitMode: 'amount',
				splits: [
					{ memberId: 'a', amount: 700 },
					{ memberId: 'b', amount: 400 },
					{ memberId: 'd', amount: 400 }
				]
			})
		];
		const balances = computeBalances(members, expenses);
		expect(netZero(balances)).toBe(true);
	});
});

describe('planSettlements', () => {
	it('returns the empty plan when nobody owes anyone', () => {
		const plan = planSettlements([
			{ memberId: 'a', net: 0 },
			{ memberId: 'b', net: 0 }
		]);
		expect(plan).toEqual([]);
	});

	it('pairs one debtor with one creditor in a single transaction', () => {
		const plan = planSettlements([
			{ memberId: 'a', net: 1000 },
			{ memberId: 'b', net: -1000 }
		]);
		expect(plan).toEqual([{ from: 'b', to: 'a', amount: 1000 }]);
	});

	it('uses a near-optimal number of transactions for a 4-way circle', () => {
		const plan = planSettlements([
			{ memberId: 'a', net: 1500 },
			{ memberId: 'b', net: -500 },
			{ memberId: 'c', net: 200 },
			{ memberId: 'd', net: -1200 }
		]);
		// Three balances are non-zero on each side combined, so a near-optimal plan
		// hits the lower bound of max(creditors, debtors) - 0 = 2 transactions when
		// possible. The greedy planner achieves either 2 or 3 here.
		expect(plan.length).toBeLessThanOrEqual(3);
		expect(plan.reduce((sum, s) => sum + s.amount, 0)).toBe(1700);
	});

	it('produces a plan that zeroes out the ledger', () => {
		const balances: MemberBalance[] = [
			{ memberId: 'a', net: 1234 },
			{ memberId: 'b', net: -567 },
			{ memberId: 'c', net: 89 },
			{ memberId: 'd', net: -756 }
		];
		const plan = planSettlements(balances);
		const settled = new Map(balances.map((b) => [b.memberId, b.net]));
		for (const tx of plan) {
			settled.set(tx.from, (settled.get(tx.from) ?? 0) + tx.amount);
			settled.set(tx.to, (settled.get(tx.to) ?? 0) - tx.amount);
		}
		for (const v of settled.values()) expect(v).toBe(0);
	});

	it('never instructs a member to pay themselves', () => {
		const plan = planSettlements([
			{ memberId: 'a', net: 500 },
			{ memberId: 'b', net: -500 }
		]);
		for (const tx of plan) expect(tx.from).not.toBe(tx.to);
	});
});
