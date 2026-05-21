<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { computeBalances, planSettlements, type Settlement } from '$lib/balance';
	import { PROJECT_COLOR_VALUES, tileBackground } from '$lib/colors';
	import { formatAmount } from '$lib/money';
	import { getCurrentMember } from '$lib/storage';
	import {
		addExpense,
		generateId,
		openRoom,
		readExpenses,
		readMembers,
		readProject
	} from '$lib/sync/doc';
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

	const balances = $derived(computeBalances(members, expenses));
	const plan = $derived(planSettlements(balances));
	const totalToSettle = $derived(plan.reduce((s, t) => s + t.amount, 0));
	const openCount = $derived(balances.filter((b) => b.net !== 0).length);

	function memberName(id: string): string {
		const m = membersById.get(id);
		if (!m) return '—';
		return m.id === currentMemberId ? 'You' : m.name;
	}

	function avatarLetter(id: string): string {
		return (membersById.get(id)?.name?.[0] ?? '?').toUpperCase();
	}

	function markPaid(t: Settlement) {
		if (!project) return;
		const fromName = membersById.get(t.from)?.name ?? '—';
		const toName = membersById.get(t.to)?.name ?? '—';
		const expense: Expense = {
			id: generateId(),
			payments: [{ memberId: t.from, amount: t.amount }],
			amount: t.amount,
			currency: project.currency,
			description: `${fromName} → ${toName}`,
			date: Date.now(),
			splitMode: 'even',
			splits: [{ memberId: t.to }],
			isSettlement: true,
			createdAt: Date.now(),
			createdBy: currentMemberId ?? t.from
		};
		addExpense(handle, expense);
	}
</script>

<svelte:head>
	<title>Settle up · {project?.name ?? 'Kostos'}</title>
</svelte:head>

<div class="screen" data-page="settle">
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
		<div class="app-bar-title">Settle up</div>
		<div class="row gap-6" style="flex: 1;"></div>
	</header>

	<div class="scroll">
		<section class="hero">
			{#if plan.length === 0}
				<div class="eyebrow">Everyone is settled</div>
				<div class="hero-amount tone-flat">
					<span class="hero-sym">{currencySymbol}</span>0.00
				</div>
				<div class="dim mono hero-caption">NO OPEN BALANCES</div>
			{:else}
				<div class="eyebrow">
					{plan.length} {plan.length === 1 ? 'transfer settles' : 'transfers settle'} everyone
				</div>
				<div class="hero-amount">
					<span class="hero-sym">{currencySymbol}</span>{(totalToSettle / 100).toFixed(2)}
				</div>
				<div class="dim mono hero-caption">
					MINIMISED FROM {openCount} OPEN {openCount === 1 ? 'BALANCE' : 'BALANCES'} · ALGORITHMIC
				</div>
			{/if}
		</section>

		{#if plan.length > 0}
			<div class="plan-list">
				{#each plan as t, i (i)}
					{@const youFrom = t.from === currentMemberId}
					{@const youTo = t.to === currentMemberId}
					{@const involvesYou = youFrom || youTo}
					<div class="card plan-card" class:involves-you={involvesYou}>
						<div class="plan-top">
							<span class="av av-md plan-av">{avatarLetter(t.from)}</span>
							<div class="col plan-text">
								<span class="plan-headline">
									<strong>{memberName(t.from)}</strong>
									<span class="muted plan-verb">pays</span>
									<strong>{memberName(t.to)}</strong>
								</span>
								<span class="dim mono plan-flow">
									{membersById.get(t.from)?.name ?? '—'} → {membersById.get(t.to)?.name ?? '—'}
								</span>
							</div>
							<span class="av av-md plan-av">{avatarLetter(t.to)}</span>
						</div>
						<hr class="hairline plan-rule" />
						<div class="row between plan-bottom">
							<div class="num plan-amount">
								<span class="plan-sym">{currencySymbol}</span>{(t.amount / 100).toFixed(2)}
							</div>
							{#if youFrom}
								<button class="btn btn-primary mark-btn" type="button" onclick={() => markPaid(t)}>
									Mark paid
								</button>
							{:else if youTo}
								<button class="btn mark-btn" type="button" onclick={() => markPaid(t)}>
									Mark received
								</button>
							{:else}
								<button
									class="btn btn-ghost mark-others"
									type="button"
									onclick={() => markPaid(t)}
								>
									Record
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<button
			class="btn btn-block manual-btn"
			type="button"
			onclick={() => goto(`/p/${roomId}/add`)}
		>
			<span class="col manual-text">
				<span class="manual-title">Record a different payment</span>
				<span class="dim manual-sub">Custom amount, partial settle, cash given outside the app</span>
			</span>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
		</button>

		<div class="card algo-card">
			<div class="row gap-8 algo-row">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="algo-icon"><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></svg>
				<p class="algo-body">
					Kostos picked the smallest set of transfers that brings every balance to zero. Marking one paid records a settlement expense; you can always delete it from the expense detail if it was an error.
				</p>
			</div>
		</div>
	</div>
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

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 14px 0 22px;
		gap: 8px;
	}

	.hero-amount {
		font-family: var(--font-display);
		font-size: 56px;
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.hero-sym {
		color: var(--ink-2);
		font-size: 28px;
	}

	.hero-caption {
		font-size: 11px;
	}

	.plan-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.plan-card {
		padding: 14px;
	}

	.plan-card.involves-you {
		background: color-mix(in oklab, var(--accent) 7%, var(--bg-2));
		border-color: color-mix(in oklab, var(--accent) 32%, var(--line));
	}

	.plan-top {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.plan-av {
		background: color-mix(in oklab, var(--ink) 12%, transparent);
		color: var(--ink);
	}

	.av-md {
		width: 40px;
		height: 40px;
		font-size: 14px;
	}

	.plan-text {
		flex: 1;
		gap: 2px;
	}

	.plan-headline {
		font-size: 14px;
		display: inline-flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.plan-verb {
		font-weight: 400;
	}

	.plan-flow {
		font-size: 11px;
	}

	.plan-rule {
		margin: 12px 0;
	}

	.plan-bottom {
		align-items: center;
	}

	.plan-amount {
		font-size: 22px;
		font-weight: 600;
	}

	.plan-sym {
		color: var(--ink-2);
		font-size: 16px;
	}

	.mark-btn {
		padding: 8px 14px;
		font-size: 13px;
	}

	.mark-others {
		font-size: 12px;
		color: var(--ink-2);
		padding: 8px 12px;
	}

	.manual-btn {
		margin-top: 18px;
		justify-content: space-between;
		padding: 14px;
	}

	.manual-text {
		align-items: flex-start;
		gap: 2px;
	}

	.manual-title {
		font-size: 13px;
		font-weight: 600;
	}

	.manual-sub {
		font-size: 11px;
		font-weight: 400;
	}

	.manual-btn svg {
		width: 18px;
		height: 18px;
	}

	.algo-card {
		margin-top: 14px;
		background: transparent;
		border: 1px dashed var(--line-2);
	}

	.algo-row {
		align-items: flex-start;
	}

	.algo-icon {
		width: 18px;
		height: 18px;
		color: var(--ink-2);
		flex-shrink: 0;
	}

	.algo-body {
		margin: 0;
		font-size: 12px;
		color: var(--ink-2);
		line-height: 1.5;
	}
</style>
