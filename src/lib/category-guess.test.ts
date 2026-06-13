import { describe, expect, it } from 'vitest';
import { buildCategoryModel, guessCategory, scoreCategories, tokenize } from './category-guess';
import type { Expense } from './types';

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

/** Build a model from [description, categoryId] pairs for terse test setup. */
function model(pairs: [string, string][]) {
	return buildCategoryModel(
		pairs.map(([description, categoryId], i) => expense({ id: `e${i}`, description, categoryId }))
	);
}

describe('tokenize', () => {
	it('lowercases and splits on non-alphanumerics', () => {
		expect(tokenize('Beer at Joeys!')).toEqual(['beer', 'joeys']);
	});

	it('drops stopwords, single chars, and bare numbers', () => {
		expect(tokenize('a 2024 trip to X with 3 friends')).toEqual(['trip', 'friends']);
	});

	it('keeps non-latin letters and accents', () => {
		expect(tokenize('Café Süß ramen')).toEqual(['café', 'süß', 'ramen']);
	});

	it('returns nothing for empty or symbol-only text', () => {
		expect(tokenize('')).toEqual([]);
		expect(tokenize('--- !!!')).toEqual([]);
	});
});

describe('buildCategoryModel', () => {
	it('only learns from expenses that have both a description and a category', () => {
		const m = buildCategoryModel([
			expense({ id: '1', description: 'Joeys', categoryId: 'drinks' }),
			expense({ id: '2', description: 'No category here' }),
			expense({ id: '3', categoryId: 'drinks' }),
			expense({ id: '4', description: 'Settle up', categoryId: 'drinks', isSettlement: true })
		]);
		expect(m.docCount).toBe(1);
		expect(m.tokenCat.has('joeys')).toBe(true);
		expect(m.tokenCat.has('settle')).toBe(false);
	});

	it('counts a repeated word once per expense', () => {
		const m = model([['joeys joeys joeys', 'drinks']]);
		expect(m.tokenCat.get('joeys')?.get('drinks')).toBe(1);
		expect(m.tokenDf.get('joeys')).toBe(1);
	});
});

describe('guessCategory', () => {
	it('learns a venue keyword from a single prior', () => {
		const m = model([['Joeys', 'drinks']]);
		expect(guessCategory(m, 'Joeys')).toBe('drinks');
	});

	it('generalizes the keyword across surrounding words', () => {
		const m = model([
			['Joeys', 'drinks'],
			['Joeys', 'drinks']
		]);
		expect(guessCategory(m, 'Beer at joeys')).toBe('drinks');
		expect(guessCategory(m, 'joeys with friends')).toBe('drinks');
	});

	it('picks the dominant category when a word leans one way', () => {
		const m = model([
			['Lunch out', 'restaurants'],
			['Lunch spot', 'restaurants'],
			['Lunch deli', 'restaurants'],
			['Lunch groceries run', 'groceries']
		]);
		expect(guessCategory(m, 'Lunch')).toBe('restaurants');
	});

	it('declines when the text points at two categories evenly', () => {
		const m = model([
			['Dinner', 'restaurants'],
			['Dinner', 'restaurants'],
			['Dinner', 'drinks'],
			['Dinner', 'drinks']
		]);
		expect(guessCategory(m, 'Dinner')).toBeNull();
	});

	it('declines on an unseen word', () => {
		const m = model([['Joeys', 'drinks']]);
		expect(guessCategory(m, 'Pharmacy')).toBeNull();
	});

	it('declines with no history', () => {
		expect(guessCategory(buildCategoryModel([]), 'Joeys')).toBeNull();
	});

	it('ignores a category the project no longer has', () => {
		const m = model([['Joeys', 'drinks']]);
		expect(guessCategory(m, 'Joeys', new Set(['restaurants']))).toBeNull();
		expect(guessCategory(m, 'Joeys', new Set(['drinks']))).toBe('drinks');
	});

	it('lets a strong specific word beat a common one', () => {
		// "the" rides on every expense; "joeys" only ever means drinks
		const m = model([
			['the supermarket', 'groceries'],
			['the taxi', 'transport'],
			['the hotel', 'lodging'],
			['the joeys', 'drinks']
		]);
		expect(guessCategory(m, 'the joeys')).toBe('drinks');
	});

	it('ranks scores highest-first', () => {
		const m = model([
			['Joeys bar', 'drinks'],
			['Joeys bar', 'drinks'],
			['Bar snacks groceries', 'groceries']
		]);
		const ranked = scoreCategories(m, 'Joeys bar');
		expect(ranked[0].categoryId).toBe('drinks');
		expect(ranked[0].score).toBeGreaterThan(ranked[1]?.score ?? 0);
	});
});
