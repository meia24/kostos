import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { browser } from '$app/environment';
import type { Expense, ExpenseSplit, Member, Project } from '$lib/types';

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
	return {
		id: p.get('id') as string,
		name: p.get('name') as string,
		description: p.get('description') as string | undefined,
		emoji: (p.get('emoji') as string | undefined) ?? '🏖',
		color: (p.get('color') as Project['color']) ?? 'lime',
		currency: p.get('currency') as string,
		currencySymbol: p.get('currencySymbol') as string,
		defaultSplit: p.get('defaultSplit') as Project['defaultSplit'],
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

		for (const m of members) handle.members.push([memberMap(m)]);
	});
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

function readExpenseEntry(entry: Y.Map<unknown>): Expense {
	const rawSplits = entry.get('splits') as Y.Array<Y.Map<unknown>> | undefined;
	const splits: ExpenseSplit[] = rawSplits
		? rawSplits.toArray().map((s) => ({
				memberId: s.get('memberId') as string,
				shares: s.get('shares') as number | undefined,
				amount: s.get('amount') as number | undefined
			}))
		: [];
	return {
		id: entry.get('id') as string,
		payerId: entry.get('payerId') as string,
		amount: entry.get('amount') as number,
		currency: entry.get('currency') as string,
		description: entry.get('description') as string | undefined,
		category: entry.get('category') as string | undefined,
		paymentMethod: entry.get('paymentMethod') as Expense['paymentMethod'] | undefined,
		date: entry.get('date') as number,
		splitMode: entry.get('splitMode') as Expense['splitMode'],
		splits,
		notes: entry.get('notes') as string | undefined,
		createdAt: entry.get('createdAt') as number,
		createdBy: entry.get('createdBy') as string
	};
}

function expenseMap(e: Expense): Y.Map<unknown> {
	const ym = new Y.Map<unknown>();
	ym.set('id', e.id);
	ym.set('payerId', e.payerId);
	ym.set('amount', e.amount);
	ym.set('currency', e.currency);
	if (e.description) ym.set('description', e.description);
	if (e.category) ym.set('category', e.category);
	if (e.paymentMethod) ym.set('paymentMethod', e.paymentMethod);
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
