import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { browser } from '$app/environment';
import {
	DEFAULT_CATEGORIES,
	DEFAULT_PAYMENT_METHODS,
	type Category,
	type Expense,
	type ExpenseSplit,
	type Member,
	type Payment,
	type PaymentMethodItem,
	type Project
} from '$lib/types';

export type RoomHandle = {
	roomId: string;
	doc: Y.Doc;
	project: Y.Map<unknown>;
	members: Y.Array<Y.Map<unknown>>;
	expenses: Y.Array<Y.Map<unknown>>;
	ready: Promise<void>;
};

type CacheEntry = {
	handle: RoomHandle;
	persistence?: IndexeddbPersistence;
};

const cache = new Map<string, CacheEntry>();

export function openRoom(roomId: string): RoomHandle {
	const cached = cache.get(roomId);
	if (cached) return cached.handle;

	const doc = new Y.Doc();
	const project = doc.getMap('project');
	const members = doc.getArray<Y.Map<unknown>>('members');
	const expenses = doc.getArray<Y.Map<unknown>>('expenses');

	let persistence: IndexeddbPersistence | undefined;
	let ready: Promise<void>;
	if (browser) {
		persistence = new IndexeddbPersistence(`kostos:${roomId}`, doc);
		ready = persistence.whenSynced.then(() => undefined);
	} else {
		ready = Promise.resolve();
	}

	const handle: RoomHandle = { roomId, doc, project, members, expenses, ready };
	cache.set(roomId, { handle, persistence });
	return handle;
}

export async function destroyRoom(roomId: string): Promise<void> {
	const entry = cache.get(roomId);
	if (!entry) return;
	if (entry.persistence) {
		await entry.persistence.destroy();
		await entry.persistence.clearData();
	}
	entry.handle.doc.destroy();
	cache.delete(roomId);
}

export function readProject(handle: RoomHandle): Project | null {
	const p = handle.project;
	if (!p.has('id')) return null;
	const rawCategories = p.get('categories') as Y.Array<Y.Map<unknown>> | undefined;
	// Projects created before categories existed return the curated default set so the
	// picker isn't empty; the Y.Array gets materialised the first time addCategory fires.
	const categories: Category[] = rawCategories
		? rawCategories.toArray().map((c) => ({
				id: c.get('id') as string,
				name: c.get('name') as string,
				emoji: c.get('emoji') as string
			}))
		: DEFAULT_CATEGORIES;
	const rawMethods = p.get('paymentMethods') as Y.Array<Y.Map<unknown>> | undefined;
	const paymentMethods: PaymentMethodItem[] = rawMethods
		? rawMethods.toArray().map((m) => ({
				id: m.get('id') as string,
				name: m.get('name') as string,
				emoji: m.get('emoji') as string
			}))
		: DEFAULT_PAYMENT_METHODS;
	return {
		id: p.get('id') as string,
		name: p.get('name') as string,
		description: p.get('description') as string | undefined,
		emoji: (p.get('emoji') as string | undefined) ?? '🏖',
		color: (p.get('color') as Project['color']) ?? 'lime',
		currency: p.get('currency') as string,
		currencySymbol: p.get('currencySymbol') as string,
		defaultSplit: p.get('defaultSplit') as Project['defaultSplit'],
		categories,
		paymentMethods,
		createdAt: p.get('createdAt') as number
	};
}

export function readMembers(handle: RoomHandle): Member[] {
	return handle.members.toArray().map((m) => ({
		id: m.get('id') as string,
		name: m.get('name') as string,
		createdAt: m.get('createdAt') as number
	}));
}

export function initProject(handle: RoomHandle, project: Project, members: Member[]): void {
	if (handle.project.has('id')) return; // idempotent: never overwrite an existing project header
	handle.doc.transact(() => {
		handle.project.set('id', project.id);
		handle.project.set('name', project.name);
		if (project.description) handle.project.set('description', project.description);
		handle.project.set('emoji', project.emoji);
		handle.project.set('color', project.color);
		handle.project.set('currency', project.currency);
		handle.project.set('currencySymbol', project.currencySymbol);
		handle.project.set('defaultSplit', project.defaultSplit);
		handle.project.set('createdAt', project.createdAt);
		handle.project.set('categories', yArrayOf(project.categories, categoryMap));
		handle.project.set('paymentMethods', yArrayOf(project.paymentMethods, paymentMethodMap));

		for (const m of members) handle.members.push([memberMap(m)]);
	});
}

export function addCategory(handle: RoomHandle, category: Category): void {
	handle.doc.transact(() => {
		let arr = handle.project.get('categories') as Y.Array<Y.Map<unknown>> | undefined;
		if (!arr) {
			arr = new Y.Array<Y.Map<unknown>>();
			handle.project.set('categories', arr);
			for (const c of DEFAULT_CATEGORIES) arr.push([categoryMap(c)]);
		}
		arr.push([categoryMap(category)]);
	});
}

export function addPaymentMethod(handle: RoomHandle, method: PaymentMethodItem): void {
	handle.doc.transact(() => {
		let arr = handle.project.get('paymentMethods') as Y.Array<Y.Map<unknown>> | undefined;
		if (!arr) {
			arr = new Y.Array<Y.Map<unknown>>();
			handle.project.set('paymentMethods', arr);
			for (const m of DEFAULT_PAYMENT_METHODS) arr.push([paymentMethodMap(m)]);
		}
		arr.push([paymentMethodMap(method)]);
	});
}

function categoryMap(c: Category): Y.Map<unknown> {
	const ym = new Y.Map<unknown>();
	ym.set('id', c.id);
	ym.set('name', c.name);
	ym.set('emoji', c.emoji);
	return ym;
}

function paymentMethodMap(p: PaymentMethodItem): Y.Map<unknown> {
	const ym = new Y.Map<unknown>();
	ym.set('id', p.id);
	ym.set('name', p.name);
	ym.set('emoji', p.emoji);
	return ym;
}

function yArrayOf<T>(items: T[], toMap: (item: T) => Y.Map<unknown>): Y.Array<Y.Map<unknown>> {
	const arr = new Y.Array<Y.Map<unknown>>();
	for (const item of items) arr.push([toMap(item)]);
	return arr;
}

export function addMember(handle: RoomHandle, member: Member): void {
	handle.doc.transact(() => {
		handle.members.push([memberMap(member)]);
	});
}

export function readExpenses(handle: RoomHandle): Expense[] {
	return handle.expenses.toArray().map(readExpenseEntry);
}

export function addExpense(handle: RoomHandle, expense: Expense): void {
	handle.doc.transact(() => {
		handle.expenses.push([expenseMap(expense)]);
	});
}

export function removeExpense(handle: RoomHandle, id: string): void {
	const items = handle.expenses;
	for (let i = 0; i < items.length; i++) {
		if (items.get(i).get('id') === id) {
			handle.doc.transact(() => items.delete(i, 1));
			return;
		}
	}
}

export function updateExpense(handle: RoomHandle, expense: Expense): void {
	const items = handle.expenses;
	for (let i = 0; i < items.length; i++) {
		if (items.get(i).get('id') === expense.id) {
			handle.doc.transact(() => {
				items.delete(i, 1);
				items.insert(i, [expenseMap(expense)]);
			});
			return;
		}
	}
}

function readExpenseEntry(entry: Y.Map<unknown>): Expense {
	const rawSplits = entry.get('splits') as Y.Array<Y.Map<unknown>> | undefined;
	const splits: ExpenseSplit[] = rawSplits
		? rawSplits.toArray().map((s) => ({
				memberId: s.get('memberId') as string,
				shares: s.get('shares') as number | undefined,
				amount: s.get('amount') as number | undefined
			}))
		: [];
	const rawPayments = entry.get('payments') as Y.Array<Y.Map<unknown>> | undefined;
	const payments: Payment[] = rawPayments
		? rawPayments.toArray().map((p) => ({
				memberId: p.get('memberId') as string,
				amount: p.get('amount') as number
			}))
		: [];
	return {
		id: entry.get('id') as string,
		payments,
		amount: entry.get('amount') as number,
		currency: entry.get('currency') as string,
		description: entry.get('description') as string | undefined,
		categoryId: entry.get('categoryId') as string | undefined,
		paymentMethodId: entry.get('paymentMethodId') as string | undefined,
		date: entry.get('date') as number,
		splitMode: entry.get('splitMode') as Expense['splitMode'],
		splits,
		notes: entry.get('notes') as string | undefined,
		isSettlement: entry.get('isSettlement') as boolean | undefined,
		createdAt: entry.get('createdAt') as number,
		createdBy: entry.get('createdBy') as string
	};
}

function expenseMap(e: Expense): Y.Map<unknown> {
	const ym = new Y.Map<unknown>();
	ym.set('id', e.id);
	const ypayments = new Y.Array<Y.Map<unknown>>();
	for (const p of e.payments) {
		const yp = new Y.Map<unknown>();
		yp.set('memberId', p.memberId);
		yp.set('amount', p.amount);
		ypayments.push([yp]);
	}
	ym.set('payments', ypayments);
	ym.set('amount', e.amount);
	ym.set('currency', e.currency);
	if (e.description) ym.set('description', e.description);
	if (e.categoryId) ym.set('categoryId', e.categoryId);
	if (e.paymentMethodId) ym.set('paymentMethodId', e.paymentMethodId);
	ym.set('date', e.date);
	ym.set('splitMode', e.splitMode);
	const ysplits = new Y.Array<Y.Map<unknown>>();
	for (const s of e.splits) {
		const ys = new Y.Map<unknown>();
		ys.set('memberId', s.memberId);
		if (s.shares !== undefined) ys.set('shares', s.shares);
		if (s.amount !== undefined) ys.set('amount', s.amount);
		ysplits.push([ys]);
	}
	ym.set('splits', ysplits);
	if (e.notes) ym.set('notes', e.notes);
	if (e.isSettlement) ym.set('isSettlement', true);
	ym.set('createdAt', e.createdAt);
	ym.set('createdBy', e.createdBy);
	return ym;
}

function memberMap(m: Member): Y.Map<unknown> {
	const ym = new Y.Map<unknown>();
	ym.set('id', m.id);
	ym.set('name', m.name);
	ym.set('createdAt', m.createdAt);
	return ym;
}

export function generateId(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	let hex = '';
	for (const b of bytes) hex += b.toString(16).padStart(2, '0');
	return hex;
}
