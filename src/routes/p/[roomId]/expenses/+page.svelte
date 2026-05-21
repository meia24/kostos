<script lang="ts">
	import { page } from '$app/state';
	import { PROJECT_COLOR_VALUES, tileBackground } from '$lib/colors';
	import ExpenseRow from '$lib/components/ExpenseRow.svelte';
	import { formatAmount } from '$lib/money';
	import { getCurrentMember } from '$lib/storage';
	import { openRoom, readExpenses, readMembers, readProject } from '$lib/sync/doc';
	import type { Expense, Member, Project } from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const handle = $derived(openRoom(roomId));

	let project = $state<Project | null>(null);
	let members = $state<Member[]>([]);
	let expenses = $state<Expense[]>([]);

	$effect(() => {
		const h = handle;
		const sync = () => {
			project = readProject(h);
			members = readMembers(h);
			expenses = readExpenses(h);
		};
		sync();
		h.project.observeDeep(sync);
		h.members.observeDeep(sync);
		h.expenses.observeDeep(sync);
		return () => {
			h.project.unobserveDeep(sync);
			h.members.unobserveDeep(sync);
			h.expenses.unobserveDeep(sync);
		};
	});

	const currentMemberId = $derived.by(() => getCurrentMember());
	const currencySymbol = $derived(project?.currencySymbol ?? '€');
	const membersById = $derived(new Map(members.map((m) => [m.id, m])));
	const categoryById = $derived(
		new Map((project?.categories ?? []).map((c) => [c.id, c]))
	);
	const methodById = $derived(
		new Map((project?.paymentMethods ?? []).map((m) => [m.id, m]))
	);

	type DayGroup = { key: string; label: string; total: number; items: Expense[] };

	const groups = $derived.by<DayGroup[]>(() => {
		const buckets = new Map<string, DayGroup>();
		const sorted = [...expenses].sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
		for (const e of sorted) {
			const key = dayKey(e.date);
			let bucket = buckets.get(key);
			if (!bucket) {
				bucket = { key, label: dayLabel(e.date), total: 0, items: [] };
				buckets.set(key, bucket);
			}
			bucket.total += e.amount;
			bucket.items.push(e);
		}
		return [...buckets.values()];
	});

	const overallTotal = $derived(expenses.reduce((s, e) => s + e.amount, 0));

	function dayKey(ts: number): string {
		const d = new Date(ts);
		return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
			.getDate()
			.toString()
			.padStart(2, '0')}`;
	}

	function dayLabel(ts: number): string {
		const d = new Date(ts);
		const today = new Date();
		const yesterday = new Date();
		yesterday.setDate(today.getDate() - 1);
		const isSameDay = (a: Date, b: Date) =>
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate();
		if (isSameDay(d, today)) return `TODAY · ${formatShort(d)}`;
		if (isSameDay(d, yesterday)) return `YESTERDAY · ${formatShort(d)}`;
		return `${d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()} · ${formatShort(d)}`;
	}

	function formatShort(d: Date): string {
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase();
	}

</script>

<svelte:head>
	<title>Expenses · {project?.name ?? 'Kostos'}</title>
</svelte:head>

<div class="screen" data-page="expenses-list">
	<header class="app-bar">
		<div class="row gap-8" style="flex: 1; align-items: center;">
			<a class="icon-btn" href="/p/{roomId}" aria-label="Back">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6" /></svg>
			</a>
			<span
				class="project-tile"
				style={project
					? `background: ${tileBackground(project.color)}; color: ${PROJECT_COLOR_VALUES[project.color]};`
					: ''}
			>
				{project?.emoji ?? '🏖'}
			</span>
		</div>
		<div class="app-bar-title">Expenses</div>
		<div class="row gap-6" style="flex: 1; justify-content: flex-end;">
			<a class="icon-btn" href="/p/{roomId}/add" aria-label="Add expense">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12" /></svg>
			</a>
		</div>
	</header>

	<div class="scroll">
		<section class="card summary-card">
			<div class="col">
				<div class="eyebrow summary-eyebrow">Total spent</div>
				<div class="num summary-amount">
					<span class="summary-sym">{currencySymbol}</span>{(overallTotal / 100).toFixed(2)}
				</div>
			</div>
			<div class="col" style="align-items: flex-end;">
				<div class="dim mono summary-count">
					{expenses.length} {expenses.length === 1 ? 'EXPENSE' : 'EXPENSES'}
				</div>
				<div class="dim mono summary-count">
					{groups.length} {groups.length === 1 ? 'DAY' : 'DAYS'}
				</div>
			</div>
		</section>

		{#if expenses.length === 0}
			<div class="card empty-state">
				<p>No expenses yet. Tap the + button to add the first one.</p>
			</div>
		{:else}
			{#each groups as g (g.key)}
				<div class="section-head day-head">
					<div class="eyebrow">{g.label}</div>
					<div class="dim mono day-total">{formatAmount(g.total, currencySymbol)}</div>
				</div>
				<div class="card day-card">
					{#each g.items as e, i (e.id)}
						{#if i > 0}<hr class="hairline" style="margin-left: 56px;" />{/if}
						<ExpenseRow
							expense={e}
							href="/p/{roomId}/expenses/{e.id}"
							{membersById}
							{categoryById}
							{methodById}
							{currentMemberId}
							symbol={currencySymbol}
							totalMembers={members.length}
							showDate={false}
						/>
					{/each}
				</div>
			{/each}
		{/if}
	</div>

	<nav class="tabbar">
		<a href="/p/{roomId}" class="tab">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11.5L12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.5z" /></svg>
			</div>
			<span>HOME</span>
			<span class="tab-dot"></span>
		</a>
		<a href="/p/{roomId}/expenses" class="tab active">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h14M5 12h14M5 17h9" /></svg>
			</div>
			<span>EXPENSES</span>
			<span class="tab-dot"></span>
		</a>
		<a class="fab" href="/p/{roomId}/add" aria-label="Add expense">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12" /></svg>
		</a>
		<a href="/p/{roomId}/stats" class="tab">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20h16M7 20V10M12 20V4M17 20v-7" /></svg>
			</div>
			<span>STATS</span>
			<span class="tab-dot"></span>
		</a>
		<a href="/p/{roomId}/people" class="tab">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="9" r="3.2" /><circle cx="16.5" cy="10" r="2.4" /><path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5M14 19c.4-2.2 2-3.4 4-3.4s3.5 1.2 4 3.4" /></svg>
			</div>
			<span>PEOPLE</span>
			<span class="tab-dot"></span>
		</a>
	</nav>
</div>

<style>
	.project-tile {
		width: 28px;
		height: 28px;
		border-radius: 9px;
		display: grid;
		place-items: center;
		font-size: 14px;
		flex-shrink: 0;
	}

	.summary-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px;
		margin-top: 4px;
	}

	.summary-eyebrow {
		margin-bottom: 4px;
	}

	.summary-amount {
		font-size: 24px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.summary-sym {
		opacity: 0.6;
		margin-right: 2px;
	}

	.summary-count {
		font-size: 10px;
		letter-spacing: 0.06em;
	}

	.empty-state {
		text-align: center;
		color: var(--ink-2);
		font-size: 13px;
		line-height: 1.5;
		padding: 24px 16px;
		margin-top: 16px;
	}

	.day-head {
		margin: 22px 0 8px;
	}

	.day-total {
		font-size: 11px;
	}

	.day-card {
		padding: 4px;
	}

</style>
