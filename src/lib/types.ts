export type DefaultSplit = 'even' | 'shares' | 'amount';

export type PaymentMethod = 'cash' | 'card' | 'bank' | 'other';

export type Project = {
	id: string;
	name: string;
	description?: string;
	emoji?: string;
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

export type ExpenseSplit = {
	memberId: string;
	shares?: number;
	amount?: number;
};

export type Expense = {
	id: string;
	payerId: string;
	amount: number;
	currency: string;
	description?: string;
	category?: string;
	paymentMethod?: PaymentMethod;
	date: number;
	splits: ExpenseSplit[];
	createdAt: number;
	createdBy: string;
};
