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

/** One contribution to an expense. Cents. The sum across an expense's payments must
 *  equal Expense.amount. A single-payer expense is just a one-row payments array. */
export type Payment = {
	memberId: string;
	amount: number;
};

/** Expense amounts are stored in minor units (cents) to avoid float drift. */
export type Expense = {
	id: string;
	payments: Payment[];
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
