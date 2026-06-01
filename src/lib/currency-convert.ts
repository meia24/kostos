/* Multi-currency conversion for the balance engine.
 *
 * Expense amounts are stored in their own currency's minor units. To ledger them against
 * a single base currency we convert each expense's total once, then rescale its payments
 * and shares to that base total so the expense still nets to zero in base (no rounding
 * drift between the credit and debit sides). */

import { currencyDecimals } from './currencies';
import type { Expense } from './types';

/** Convert a minor-units amount across currencies using a rate expressed as
 *  "to-major-units per 1 from-major-unit". Accounts for differing decimal places. */
export function convertCents(
	amount: number,
	fromCurrency: string,
	toCurrency: string,
	rate: number
): number {
	const major = amount / 10 ** currencyDecimals(fromCurrency);
	return Math.round(major * rate * 10 ** currencyDecimals(toCurrency));
}

/** An expense's total in the project base currency. Returns the native amount when the
 *  expense is already in base or has no stored rate. */
export function expenseBaseAmount(expense: Expense, baseCurrency: string | undefined): number {
	if (!baseCurrency || !expense.currency || expense.currency === baseCurrency || !expense.exchangeRate) {
		return expense.amount;
	}
	return convertCents(expense.amount, expense.currency, baseCurrency, expense.exchangeRate);
}

/** A copy of the expense expressed in the base currency: its total converted via the
 *  stored rate, with payments (and amount-mode splits) rescaled so the parts still sum to
 *  that total. Returns the original untouched when it is already in base. */
export function expenseInBase(expense: Expense, baseCurrency: string | undefined): Expense {
	const baseAmount = expenseBaseAmount(expense, baseCurrency ?? expense.currency);
	if (baseAmount === expense.amount) return expense;

	const payAmounts = scaleToTotal(
		expense.payments.map((p) => p.amount),
		baseAmount
	);
	const payments = expense.payments.map((p, i) => ({ ...p, amount: payAmounts[i] }));

	let splits = expense.splits;
	if (expense.splitMode === 'amount') {
		const splitAmounts = scaleToTotal(
			expense.splits.map((s) => s.amount ?? 0),
			baseAmount
		);
		splits = expense.splits.map((s, i) => ({ ...s, amount: splitAmounts[i] }));
	}

	return {
		...expense,
		amount: baseAmount,
		currency: baseCurrency ?? expense.currency,
		exchangeRate: undefined,
		payments,
		splits
	};
}

/** Rescale integer parts to a new integer total, preserving proportions with a
 *  deterministic largest-remainder distribution so the parts always sum to newTotal.
 *  A no-op when the parts already sum to newTotal. */
export function scaleToTotal(parts: number[], newTotal: number): number[] {
	const oldTotal = parts.reduce((a, b) => a + b, 0);
	if (oldTotal === newTotal) return parts.slice();
	if (oldTotal === 0) {
		const out = new Array<number>(parts.length).fill(0);
		if (out.length > 0) out[0] = newTotal;
		return out;
	}
	const exact = parts.map((p) => (p * newTotal) / oldTotal);
	const floored = exact.map((x) => Math.floor(x));
	let remainder = newTotal - floored.reduce((a, b) => a + b, 0);
	const order = exact
		.map((x, i) => ({ i, frac: x - Math.floor(x) }))
		.sort((a, b) => b.frac - a.frac);
	let k = 0;
	while (remainder > 0 && order.length > 0) {
		floored[order[k % order.length].i] += 1;
		remainder--;
		k++;
	}
	return floored;
}
