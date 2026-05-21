<script lang="ts">
	import { page } from '$app/state';
	import ExpenseRow from '$lib/components/ExpenseRow.svelte';
	import ScreenAppBar from '$lib/components/ScreenAppBar.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import { formatAmount } from '$lib/money';
	import { getCurrentMember } from '$lib/storage';
	import { useRoom } from '$lib/sync/useRoom.svelte';
	import type { Expense } from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const room = $derived(useRoom(roomId));
	$effect(() => room.observe());

	const project = $derived(room.project);
	const members = $derived(room.members);
	const expenses = $derived(room.expenses);

	const currentMemberId = $derived.by(() => getCurrentMember());
	const currencySymbol = $derived(room.currencySymbol);
	const membersById = $derived(room.membersById);
	const categoryById = $derived(room.categoryById);
	const methodById = $derived(room.methodById);

	let query = $state('');
	let searchEl = $state<HTMLInputElement | null>(null);

	function clearQuery() {
		query = '';
		searchEl?.focus();
	}

	function matchesQuery(e: Expense, q: string): boolean {
		if (e.description && e.description.toLowerCase().includes(q)) return true;
		if (e.notes && e.notes.toLowerCase().includes(q)) return true;
		for (const p of e.payments) {
			const name = membersById.get(p.memberId)?.name?.toLowerCase();
			if (name && name.includes(q)) return true;
		}
		if (e.categoryId) {
			const cat = categoryById.get(e.categoryId)?.name?.toLowerCase();
			if (cat && cat.includes(q)) return true;
		}
		if (e.paymentMethodId) {
			const method = methodById.get(e.paymentMethodId)?.name?.toLowerCase();
			if (method && method.includes(q)) return true;
		}
		return false;
	}

	const filtered = $derived.by(() => {
		const trimmed = query.trim().toLowerCase();
		if (!trimmed) return expenses;
		return expenses.filter((e) => matchesQuery(e, trimmed));
	});

	type DayGroup = { key: string; label: string; total: number; items: Expense[] };

	const groups = $derived.by<DayGroup[]>(() => {
		const buckets = new Map<string, DayGroup>();
		const sorted = [...filtered].sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
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

	const overallTotal = $derived(filtered.reduce((s, e) => s + e.amount, 0));
	const isFiltering = $derived(query.trim().length > 0);

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
	<ScreenAppBar title="Expenses" backHref="/p/{roomId}" {project}>
		{#snippet right()}
			<a class="icon-btn" href="/p/{roomId}/add" aria-label="Add expense">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12" /></svg>
			</a>
		{/snippet}
	</ScreenAppBar>

	<div class="search-bar">
		<span class="search-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>
		</span>
		<input
			bind:this={searchEl}
			bind:value={query}
			class="search-input"
			placeholder="Search title, payer, category, method, notes"
			type="search"
			autocomplete="off"
			spellcheck="false"
		/>
		{#if query}
			<button
				class="search-clear"
				type="button"
				onclick={clearQuery}
				aria-label="Clear search"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
			</button>
		{/if}
	</div>

	<div class="scroll">
		<section class="card summary-card">
			<div class="col">
				<div class="eyebrow summary-eyebrow">
					{isFiltering ? 'Matches' : 'Total spent'}
				</div>
				<div class="num summary-amount">
					<span class="summary-sym">{currencySymbol}</span>{(overallTotal / 100).toFixed(2)}
				</div>
			</div>
			<div class="col" style="align-items: flex-end;">
				<div class="dim mono summary-count">
					{filtered.length} {filtered.length === 1 ? 'EXPENSE' : 'EXPENSES'}
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
		{:else if filtered.length === 0}
			<div class="card empty-state">
				<p>No expenses match <strong>“{query.trim()}”</strong>.</p>
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
							{query}
						/>
					{/each}
				</div>
			{/each}
		{/if}
	</div>

	<TabBar {roomId} active="expenses" />
</div>

<style>
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

	.search-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 22px 4px;
		background: var(--bg);
	}

	.search-icon {
		display: grid;
		place-items: center;
		color: var(--ink-3);
	}

	.search-icon svg {
		width: 18px;
		height: 18px;
	}

	.search-input {
		flex: 1;
		background: var(--bg-2);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		color: var(--ink);
		padding: 10px 14px;
		font-size: 14px;
		outline: none;
		font-family: var(--font-sans);
	}

	.search-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent);
	}

	.search-input::placeholder {
		color: var(--ink-3);
	}

	.search-clear {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 999px;
		background: transparent;
		border: 0;
		color: var(--ink-2);
		cursor: pointer;
	}

	.search-clear svg {
		width: 14px;
		height: 14px;
	}
</style>
