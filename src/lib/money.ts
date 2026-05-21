/* Money formatting for minor-units (cents) amounts.
 *
 * Display always renders with the project currency symbol and tabular-num figures.
 * Two helpers: `formatAmount` for unsigned totals, `formatSigned` for balances where
 * the leading sign matters (the design uses a Unicode minus to align across rows).
 */

const MINUS = '−';

function formatBase(cents: number): string {
	const abs = Math.abs(cents);
	const whole = Math.trunc(abs / 100);
	const fraction = (abs % 100).toString().padStart(2, '0');
	return `${whole.toLocaleString('en-US')}.${fraction}`;
}

export function formatAmount(cents: number, symbol: string): string {
	const sign = cents < 0 ? MINUS : '';
	return `${sign}${symbol}${formatBase(cents)}`;
}

export function formatSigned(cents: number, symbol: string): string {
	if (cents === 0) return `${symbol}${formatBase(0)}`;
	const sign = cents < 0 ? MINUS : '+';
	return `${sign}${symbol}${formatBase(cents)}`;
}

/** Render a cents value for a numeric input. Negatives use the keyboard hyphen because
 *  inputs reject the Unicode minus. Used to pre-fill amount fields on edit. */
export function toInputValue(cents: number): string {
	return (cents / 100).toFixed(2);
}
