export type DefaultSplit = 'even' | 'shares' | 'amount';

export type PaymentMethod = 'cash' | 'card' | 'bank' | 'other';

export type ProjectColor = 'lime' | 'cyan' | 'violet' | 'amber' | 'coral' | 'blue';

export type Project = {
	id: string;
	name: string;
	description?: string;
	emoji: string;
	color: ProjectColor;
	currency: string;
	currencySymbol: string;
	defaultSplit: DefaultSplit;
	createdAt: number;
};

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

/** Expense amounts are stored in minor units (cents) to avoid float drift. */
export type Expense = {
	id: string;
	payerId: string;
	amount: number;
	currency: string;
	description?: string;
	category?: string;
	paymentMethod?: PaymentMethod;
	date: number;
	splitMode: SplitMode;
	splits: ExpenseSplit[];
	notes?: string;
	createdAt: number;
	createdBy: string;
};
