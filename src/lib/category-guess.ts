import type { Expense } from './types';

/** Learns which words a group tends to file under which category, then guesses the
 *  category for a new description. Built entirely from the group's own past expenses,
 *  so it speaks the group's language ("Joeys" -> Drinks) and needs no server or model. */
export type CategoryModel = {
	/** token -> categoryId -> number of past expenses in that category whose description held the token */
	tokenCat: Map<string, Map<string, number>>;
	/** token -> number of past expenses (any category) whose description held the token */
	tokenDf: Map<string, number>;
	/** how many categorised expenses the model learned from */
	docCount: number;
};

// the idf weighting already fades promiscuous words out; this short list just spares the
// classifier from carrying obvious glue words around. lowercase, latin only by design.
const STOPWORDS = new Set([
	'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with',
	'from', 'our', 'my', 'we', 'us', 'it', 'is', 'was', 'were', 'be', 'this', 'that',
	'these', 'those', 'some', 'any', 'per', 'via', 'plus', 'me', 'you'
]);

// the winner must hold this share of the total token weight, else the text is too
// ambiguous to act on and we leave the picker alone.
const MIN_CONFIDENCE = 0.6;

export function tokenize(text: string): string[] {
	const matches = text.toLowerCase().match(/[\p{L}\p{N}]+/gu);
	if (!matches) return [];
	const out: string[] = [];
	for (const tok of matches) {
		if (tok.length < 2) continue;
		if (/^\d+$/.test(tok)) continue; // bare numbers (amounts, years) carry no category signal
		if (STOPWORDS.has(tok)) continue;
		out.push(tok);
	}
	return out;
}

export function buildCategoryModel(expenses: Expense[]): CategoryModel {
	const tokenCat = new Map<string, Map<string, number>>();
	const tokenDf = new Map<string, number>();
	let docCount = 0;

	for (const e of expenses) {
		if (e.isSettlement) continue; // settlements aren't real spending, their text is boilerplate
		if (!e.categoryId || !e.description) continue;
		const tokens = new Set(tokenize(e.description)); // count each token once per expense
		if (tokens.size === 0) continue;
		docCount++;
		for (const tok of tokens) {
			let byCat = tokenCat.get(tok);
			if (!byCat) {
				byCat = new Map();
				tokenCat.set(tok, byCat);
			}
			byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + 1);
			tokenDf.set(tok, (tokenDf.get(tok) ?? 0) + 1);
		}
	}

	return { tokenCat, tokenDf, docCount };
}

export type CategoryScore = { categoryId: string; score: number };

/** Ranks every category that shares a word with `text`, strongest first. Exposed mainly
 *  for tests and inspection; the form uses guessCategory. */
export function scoreCategories(model: CategoryModel, text: string): CategoryScore[] {
	const { tokenCat, tokenDf, docCount } = model;
	if (docCount === 0) return [];

	const scores = new Map<string, number>();
	for (const tok of new Set(tokenize(text))) {
		const byCat = tokenCat.get(tok);
		if (!byCat) continue;
		const df = tokenDf.get(tok) ?? 0;
		// rarer words point harder at a category; words seen across many expenses fade out
		const idf = Math.log((docCount + 1) / (df + 1)) + 1;
		for (const [categoryId, count] of byCat) {
			scores.set(categoryId, (scores.get(categoryId) ?? 0) + count * idf);
		}
	}

	return [...scores.entries()]
		.map(([categoryId, score]) => ({ categoryId, score }))
		.sort((a, b) => b.score - a.score);
}

/** Best-guess category id for a description, or null when the evidence is thin or the
 *  text points at two categories at once. `validIds`, when given, drops guesses for
 *  categories the project no longer has, so a deleted category never gets re-suggested. */
export function guessCategory(
	model: CategoryModel,
	text: string,
	validIds?: Set<string>
): string | null {
	let ranked = scoreCategories(model, text);
	if (validIds) ranked = ranked.filter((r) => validIds.has(r.categoryId));
	if (ranked.length === 0) return null;

	const total = ranked.reduce((sum, r) => sum + r.score, 0);
	const top = ranked[0];
	if (top.score <= 0 || total <= 0) return null;
	if (top.score / total < MIN_CONFIDENCE) return null;
	return top.categoryId;
}
