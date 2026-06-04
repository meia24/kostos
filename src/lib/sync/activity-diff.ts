/* Pure structural diff for expense edits, feeding the activity log.
 *
 * Returns raw before/after values only; the renderer formats currency, dates, and
 * member names so events stay locale-agnostic. No Yjs or browser dependencies, so
 * it is unit-testable in isolation.
 */

import type { ActivityChange, Expense, ExpenseSplit, Payment } from '$lib/types';

function serializePayments(payments: Payment[]): string {
	return [...payments]
		.sort((a, b) => a.memberId.localeCompare(b.memberId))
		.map((p) => `${p.memberId}:${p.amount}`)
		.join(',');
}

function serializeSplits(splits: ExpenseSplit[]): string {
	return [...splits]
		.sort((a, b) => a.memberId.localeCompare(b.memberId))
		.map((s) => `${s.memberId}:${s.shares ?? ''}:${s.amount ?? ''}`)
		.join(',');
}

export function diffExpense(prev: Expense, next: Expense): ActivityChange[] {
	const changes: ActivityChange[] = [];
	if (prev.amount !== next.amount || prev.currency !== next.currency) {
		changes.push({
			kind: 'amount',
			from: prev.amount,
			to: next.amount,
			fromCurrency: prev.currency,
			toCurrency: next.currency
		});
	}
	if ((prev.description ?? '') !== (next.description ?? '')) {
		changes.push({ kind: 'text', from: prev.description ?? '', to: next.description ?? '' });
	}
	if (serializePayments(prev.payments) !== serializePayments(next.payments)) {
		const prevIds = [...new Set(prev.payments.map((p) => p.memberId))].sort();
		const nextIds = [...new Set(next.payments.map((p) => p.memberId))].sort();
		// carry the member ids only when the set of payers changed; if just the
		// per-payer amounts moved, the renderer shows a plain "paid by"
		if (prevIds.join(',') !== nextIds.join(',')) {
			changes.push({ kind: 'paidBy', from: prevIds, to: nextIds });
		} else {
			changes.push({ kind: 'paidBy' });
		}
	}
	if (prev.date !== next.date) {
		changes.push({ kind: 'date', from: prev.date, to: next.date });
	}
	if (prev.splitMode !== next.splitMode) {
		changes.push({ kind: 'split', from: prev.splitMode, to: next.splitMode });
	} else if (serializeSplits(prev.splits) !== serializeSplits(next.splits)) {
		changes.push({ kind: 'split' });
	}
	return changes;
}
