import { describe, expect, it } from 'vitest';
import { evalExpression, evalToCents, toMinorUnits } from './math';

describe('evalExpression', () => {
	it('returns a plain number unchanged', () => {
		expect(evalExpression('42')).toBe(42);
		expect(evalExpression('3.14')).toBe(3.14);
	});

	it('evaluates simple expressions', () => {
		expect(evalExpression('50/20-2')).toBeCloseTo(0.5);
		expect(evalExpression('(100+5)/3')).toBeCloseTo(35);
		expect(evalExpression('2.5*4')).toBe(10);
	});

	it('handles whitespace', () => {
		expect(evalExpression('  120 + 5 ')).toBe(125);
	});

	it('accepts comma as decimal separator', () => {
		expect(evalExpression('3,5+1,5')).toBe(5);
	});

	it('returns null on empty input', () => {
		expect(evalExpression('')).toBeNull();
		expect(evalExpression('   ')).toBeNull();
	});

	it('rejects identifier access', () => {
		expect(evalExpression('window')).toBeNull();
		expect(evalExpression('process.exit(0)')).toBeNull();
		expect(evalExpression('alert(1)')).toBeNull();
	});

	it('rejects string injection attempts', () => {
		expect(evalExpression('"foo"')).toBeNull();
		expect(evalExpression("'a'+1")).toBeNull();
	});

	it('rejects pure operator soup', () => {
		expect(evalExpression('+++')).toBeNull();
		expect(evalExpression('---')).toBeNull();
	});

	it('returns null when the expression throws or yields non-finite', () => {
		expect(evalExpression('1/0')).toBeNull();
		expect(evalExpression('5(')).toBeNull();
	});

	it('accepts a leading minus', () => {
		expect(evalExpression('-50/2')).toBe(-25);
	});
});

describe('toMinorUnits', () => {
	it('converts a clean decimal', () => {
		expect(toMinorUnits(15.5)).toBe(1550);
	});

	it('rounds away from zero on .5 boundaries', () => {
		expect(toMinorUnits(0.005)).toBe(1);
		expect(toMinorUnits(-0.005)).toBe(-1);
	});

	it('does not lose pennies on noisy floats', () => {
		expect(toMinorUnits(0.1 + 0.2)).toBe(30);
	});
});

describe('evalToCents', () => {
	it('round-trips a typical receipt math', () => {
		expect(evalToCents('(120+5)/3')).toBe(4167);
	});

	it('returns null for invalid input', () => {
		expect(evalToCents('foo')).toBeNull();
	});
});
