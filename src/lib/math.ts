/* Safe inline-math evaluator for currency inputs.
 *
 * The amount fields accept arithmetic like `50/20-2` or `(120 + 5) / 3`. We restrict
 * the input to digits, whitespace, decimal separators, and the operators + - * / ( ),
 * then let the JS engine evaluate. No identifiers means no global access; no quotes
 * means no string injection. The validating regex is the security boundary.
 */

const ALLOWED = /^[\d\s+\-*/().,]+$/;

/** Evaluate a math expression like `50/20-2`. Returns the numeric result, or null
 *  if the input is empty, malformed, non-numeric, or contains disallowed characters.
 *  Commas are accepted as decimal separators (European convention).
 */
export function evalExpression(input: string): number | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	if (!ALLOWED.test(trimmed)) return null;
	if (/^[+\-*/.,]+$/.test(trimmed)) return null;

	const normalized = trimmed.replace(/,/g, '.');
	try {
		const value = new Function(`"use strict"; return (${normalized})`)();
		if (typeof value !== 'number' || !Number.isFinite(value)) return null;
		return value;
	} catch {
		return null;
	}
}

/** Convert a decimal amount to integer minor units (cents). Rounds away from zero
 *  at 0.5 to mirror what users typing currency see. */
export function toMinorUnits(value: number): number {
	const scaled = value * 100;
	return scaled >= 0 ? Math.floor(scaled + 0.5) : -Math.floor(-scaled + 0.5);
}

/** Evaluate then convert to minor units in one call. Returns null on invalid input. */
export function evalToCents(input: string): number | null {
	const result = evalExpression(input);
	if (result === null) return null;
	return toMinorUnits(result);
}
