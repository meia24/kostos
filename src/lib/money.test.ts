import { describe, expect, it } from 'vitest';
import { formatAmount, formatSigned, toInputValue } from './money';

describe('formatAmount', () => {
	it('renders positive amounts with the currency symbol', () => {
		expect(formatAmount(8420, '€')).toBe('€84.20');
	});

	it('renders zero without a sign', () => {
		expect(formatAmount(0, '$')).toBe('$0.00');
	});

	it('uses a unicode minus on negatives', () => {
		expect(formatAmount(-1599, '£')).toBe('−£15.99');
	});

	it('thousands separator on large totals', () => {
		expect(formatAmount(123456789, '€')).toBe('€1,234,567.89');
	});
});

describe('formatSigned', () => {
	it('shows a plus on positive balances', () => {
		expect(formatSigned(1000, '€')).toBe('+€10.00');
	});

	it('strips the sign at zero', () => {
		expect(formatSigned(0, '€')).toBe('€0.00');
	});

	it('shows a unicode minus on negative balances', () => {
		expect(formatSigned(-500, '€')).toBe('−€5.00');
	});
});

describe('toInputValue', () => {
	it('renders an input-friendly decimal', () => {
		expect(toInputValue(1550)).toBe('15.50');
		expect(toInputValue(0)).toBe('0.00');
	});
});
