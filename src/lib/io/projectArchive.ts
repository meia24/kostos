import type {
	Category,
	DefaultSplit,
	Expense,
	Member,
	PaymentMethodItem,
	Project,
	ProjectColor,
	SplitMode
} from '$lib/types';

/* Serialized project state for backup and restore.
 *
 * Members, categories, and payment methods keep their original IDs because expenses
 * reference them. The project's id is omitted: import always allocates a fresh roomId,
 * since the old one no longer maps to a live room.
 */
export type ProjectArchive = {
	schemaVersion: 1;
	app: 'kostos';
	exportedAt: number;
	project: {
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
	members: Member[];
	expenses: Expense[];
};

export const ARCHIVE_SCHEMA_VERSION = 1;

export function serializeProject(
	project: Project,
	members: Member[],
	expenses: Expense[]
): ProjectArchive {
	return {
		schemaVersion: ARCHIVE_SCHEMA_VERSION,
		app: 'kostos',
		exportedAt: Date.now(),
		project: {
			name: project.name,
			description: project.description,
			emoji: project.emoji,
			color: project.color,
			currency: project.currency,
			currencySymbol: project.currencySymbol,
			defaultSplit: project.defaultSplit,
			categories: project.categories,
			paymentMethods: project.paymentMethods,
			createdAt: project.createdAt
		},
		members,
		expenses
	};
}

export type ArchiveParseResult =
	| { ok: true; archive: ProjectArchive }
	| { ok: false; error: string };

export function parseProjectArchive(input: unknown): ArchiveParseResult {
	let raw: unknown = input;
	if (typeof input === 'string') {
		try {
			raw = JSON.parse(input);
		} catch {
			return { ok: false, error: 'File is not valid JSON.' };
		}
	}
	if (!isObject(raw)) return { ok: false, error: 'File is not a Kostos backup.' };
	if (raw.app !== 'kostos') return { ok: false, error: 'File is not a Kostos backup.' };
	if (raw.schemaVersion !== ARCHIVE_SCHEMA_VERSION) {
		return {
			ok: false,
			error: `Unsupported backup version (got ${raw.schemaVersion}, expected ${ARCHIVE_SCHEMA_VERSION}).`
		};
	}

	const project = raw.project;
	if (!isObject(project) || typeof project.name !== 'string') {
		return { ok: false, error: 'Backup is missing project metadata.' };
	}

	const members = raw.members;
	if (!Array.isArray(members) || !members.every(isValidMember)) {
		return { ok: false, error: 'Backup has malformed members.' };
	}

	const expenses = raw.expenses;
	if (!Array.isArray(expenses) || !expenses.every(isValidExpense)) {
		return { ok: false, error: 'Backup has malformed expenses.' };
	}

	return { ok: true, archive: raw as ProjectArchive };
}

/* ---------------- CSV ---------------- */

const CSV_HEADERS = [
	'date',
	'description',
	'amount',
	'currency',
	'category',
	'payment_method',
	'is_settlement',
	'notes',
	'split_mode',
	'payers',
	'splits',
	'created_at'
] as const;

export function toCSV(project: Project, members: Member[], expenses: Expense[]): string {
	const memberName = nameLookup(members);
	const categoryName = nameLookup(project.categories);
	const methodName = nameLookup(project.paymentMethods);

	const rows = [CSV_HEADERS.join(',')];
	const sorted = [...expenses].sort((a, b) => a.date - b.date);
	for (const e of sorted) {
		rows.push(
			[
				toISODate(e.date),
				csvEscape(e.description ?? ''),
				formatAmount(e.amount),
				csvEscape(e.currency),
				csvEscape(e.categoryId ? categoryName(e.categoryId) : ''),
				csvEscape(e.paymentMethodId ? methodName(e.paymentMethodId) : ''),
				e.isSettlement ? 'true' : 'false',
				csvEscape(e.notes ?? ''),
				e.splitMode,
				csvEscape(formatPayers(e, memberName)),
				csvEscape(formatSplits(e, memberName)),
				toISODate(e.createdAt)
			].join(',')
		);
	}
	return rows.join('\n') + '\n';
}

function nameLookup<T extends { id: string; name: string }>(items: T[]): (id: string) => string {
	const map = new Map(items.map((i) => [i.id, i.name]));
	return (id) => map.get(id) ?? id;
}

function formatPayers(e: Expense, name: (id: string) => string): string {
	return e.payments.map((p) => `${name(p.memberId)}:${formatAmount(p.amount)}`).join('|');
}

function formatSplits(e: Expense, name: (id: string) => string): string {
	if (e.splitMode === 'even') return e.splits.map((s) => name(s.memberId)).join('|');
	if (e.splitMode === 'shares') {
		return e.splits.map((s) => `${name(s.memberId)}:${s.shares ?? 0}`).join('|');
	}
	return e.splits.map((s) => `${name(s.memberId)}:${formatAmount(s.amount ?? 0)}`).join('|');
}

function formatAmount(cents: number): string {
	const sign = cents < 0 ? '-' : '';
	const abs = Math.abs(cents);
	const whole = Math.floor(abs / 100);
	const frac = (abs % 100).toString().padStart(2, '0');
	return `${sign}${whole}.${frac}`;
}

function toISODate(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

function csvEscape(value: string): string {
	if (value === '') return '';
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/* ---------------- validation helpers ---------------- */

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidMember(value: unknown): value is Member {
	return (
		isObject(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		typeof value.createdAt === 'number'
	);
}

function isValidExpense(value: unknown): value is Expense {
	if (!isObject(value)) return false;
	if (typeof value.id !== 'string') return false;
	if (typeof value.amount !== 'number') return false;
	if (typeof value.currency !== 'string') return false;
	if (typeof value.date !== 'number') return false;
	if (typeof value.createdAt !== 'number') return false;
	if (typeof value.createdBy !== 'string') return false;
	if (!isValidSplitMode(value.splitMode)) return false;
	if (!Array.isArray(value.payments) || !value.payments.every(isValidPayment)) return false;
	if (!Array.isArray(value.splits) || !value.splits.every(isValidSplit)) return false;
	return true;
}

function isValidSplitMode(value: unknown): value is SplitMode {
	return value === 'even' || value === 'shares' || value === 'amount';
}

function isValidPayment(value: unknown): boolean {
	return isObject(value) && typeof value.memberId === 'string' && typeof value.amount === 'number';
}

function isValidSplit(value: unknown): boolean {
	if (!isObject(value)) return false;
	if (typeof value.memberId !== 'string') return false;
	if (value.shares !== undefined && typeof value.shares !== 'number') return false;
	if (value.amount !== undefined && typeof value.amount !== 'number') return false;
	return true;
}
