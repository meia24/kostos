export type DefaultSplit = 'even' | 'shares' | 'amount';

export type ProjectColor = 'lime' | 'cyan' | 'violet' | 'amber' | 'coral' | 'blue';

export type Category = {
	id: string;
	name: string;
	emoji: string;
};

export type PaymentMethodItem = {
	id: string;
	name: string;
	emoji: string;
};

export type Project = {
	id: string;
	name: string;
	description?: string;
	emoji: string;
	color: ProjectColor;
	currency: string;
	currencySymbol: string;
	defaultSplit: DefaultSplit;
	categories: Category[];
	paymentMethods: PaymentMethodItem[];
	createdAt: number;
};

export const DEFAULT_CATEGORIES: Category[] = [
	{ id: 'cat-groceries', name: 'Groceries', emoji: '🛒' },
	{ id: 'cat-restaurants', name: 'Restaurants', emoji: '🍽️' },
	{ id: 'cat-transport', name: 'Transport', emoji: '🚗' },
	{ id: 'cat-lodging', name: 'Lodging', emoji: '🛏️' },
	{ id: 'cat-activities', name: 'Activities', emoji: '🎉' },
	{ id: 'cat-other', name: 'Other', emoji: '📝' }
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodItem[] = [
	{ id: 'pm-cash', name: 'Cash', emoji: '💵' },
	{ id: 'pm-card', name: 'Card', emoji: '💳' },
	{ id: 'pm-bank', name: 'Bank transfer', emoji: '🏦' },
	{ id: 'pm-other', name: 'Other', emoji: '📝' }
];

export type Member = {
	id: string;
	name: string;
	createdAt: number;
};

export type SplitMode = 'even' | 'shares' | 'amount';

export type ExpenseSplit = {
	memberId: string;
	shares?: number;
	amount?: number;
};

/** One contribution to an expense. Cents. The sum across an expense's payments must
 *  equal Expense.amount. A single-payer expense is just a one-row payments array. */
export type Payment = {
	memberId: string;
	amount: number;
};

/** Expense amounts are stored in minor units (cents) to avoid float drift.
 *  Settlements (`isSettlement: true`) are regular expenses structurally — a single payer,
 *  a single split member, even split — and feed the same `computeBalances` math. The flag
 *  exists so the UI can tag them visually and offer separate listing/filtering. */
export type Expense = {
	id: string;
	payments: Payment[];
	amount: number;
	currency: string;
	description?: string;
	categoryId?: string;
	paymentMethodId?: string;
	date: number;
	splitMode: SplitMode;
	splits: ExpenseSplit[];
	notes?: string;
	isSettlement?: boolean;
	createdAt: number;
	createdBy: string;
};
