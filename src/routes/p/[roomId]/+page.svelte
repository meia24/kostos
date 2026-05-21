<script lang="ts">
	import { page } from '$app/state';
	import { computeBalances, planSettlements } from '$lib/balance';
	import { PROJECT_COLOR_VALUES, tileBackground } from '$lib/colors';
	import ExpenseRow from '$lib/components/ExpenseRow.svelte';
	import { formatAmount } from '$lib/money';
	import { getCurrentMember, getCurrentProject } from '$lib/storage';
	import { openRoom, readExpenses, readMembers, readProject } from '$lib/sync/doc';
	import type { Expense, Member, Project } from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const handle = $derived(openRoom(roomId));

	let project = $state<Project | null>(null);
	let members = $state<Member[]>([]);
	let expenses = $state<Expense[]>([]);
	let copied = $state(false);
	let showShare = $state(false);

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
	const youMember = $derived(members.find((m) => m.id === currentMemberId) ?? null);
	const currencySymbol = $derived(project?.currencySymbol ?? '€');
	const membersById = $derived(new Map(members.map((m) => [m.id, m])));
	const categoryById = $derived(new Map((project?.categories ?? []).map((c) => [c.id, c])));
	const methodById = $derived(
		new Map((project?.paymentMethods ?? []).map((m) => [m.id, m]))
	);

	const balances = $derived(computeBalances(members, expenses));
	const yourBalance = $derived.by(() => {
		if (!currentMemberId) return 0;
		return balances.find((b) => b.memberId === currentMemberId)?.net ?? 0;
	});
	const plan = $derived(planSettlements(balances));
	const yourPlan = $derived(
		plan.filter((t) => t.from === currentMemberId || t.to === currentMemberId)
	);
	const recentExpenses = $derived(
		[...expenses].sort((a, b) => b.date - a.date || b.createdAt - a.createdAt).slice(0, 6)
	);
	const shareUrl = $derived.by(() => {
		const stored = getCurrentProject();
		if (!stored || stored.roomId !== roomId) return null;
		return `${location.origin}/join?room=${encodeURIComponent(roomId)}#${stored.secret}`;
	});

	async function copyShareUrl() {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			const el = document.getElementById('share-url-display');
			if (el && el instanceof HTMLInputElement) el.select();
		}
	}

	function balanceEyebrow(value: number): string {
		if (value > 0) return "You're owed";
		if (value < 0) return 'You owe';
		return 'All settled';
	}

	function payerName(id: string): string {
		const m = membersById.get(id);
		if (!m) return '—';
		return m.id === currentMemberId ? 'You' : m.name;
	}
</script>

<svelte:head>
	<title>{project?.name ? `${project.name} · Kostos` : 'Kostos'}</title>
</svelte:head>

<div class="screen" data-page="dashboard">
	<header class="app-bar">
		<div class="row gap-8" style="flex: 1; align-items: center;">
			<span
				class="project-tile"
				style={project
					? `background: ${tileBackground(project.color)}; color: ${PROJECT_COLOR_VALUES[project.color]};`
					: ''}
			>
				{project?.emoji ?? '🏖'}
			</span>
			<span class="project-label col">
				<span class="app-bar-title project-name">{project?.name ?? 'Loading'}</span>
				<span class="dim mono project-token">{roomId}</span>
			</span>
		</div>
		<div class="row gap-6" style="flex: 0; justify-content: flex-end;">
			<button class="icon-btn" aria-label="Share" onclick={() => (showShare = !showShare)}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 4v12M8 8l4-4 4 4M5 14v5h14v-5" /></svg>
			</button>
		</div>
	</header>

	<div class="scroll">
		<section class="balance-block">
			<div class="eyebrow balance-eyebrow">
				{balanceEyebrow(yourBalance)}
			</div>
			<div class="balance-amount" class:tone-owed={yourBalance > 0} class:tone-owe={yourBalance < 0}>
				<span class="symbol">{currencySymbol}</span>{(Math.abs(yourBalance) / 100).toFixed(2)}
			</div>
			{#if youMember}
				<p class="dim balance-sub">as <strong>{youMember.name}</strong></p>
			{:else}
				<p class="dim balance-sub">No member claimed on this device.</p>
			{/if}
		</section>

		{#if showShare}
			<section class="card share-card">
				<div class="row between" style="margin-bottom: 10px;">
					<span class="eyebrow">Invite token</span>
					<button
						class="btn btn-ghost copy-btn"
						type="button"
						onclick={copyShareUrl}
						disabled={!shareUrl}
					>
						{#if copied}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7" /></svg>
							<span>Copied</span>
						{:else}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 4H6a2 2 0 0 0-2 2v10" /></svg>
							<span>Copy link</span>
						{/if}
					</button>
				</div>
				<span class="token-pill">{roomId}</span>
				{#if shareUrl}
					<input id="share-url-display" class="share-url-display" value={shareUrl} readonly />
				{/if}
				<p class="dim share-hint">
					Anyone with this link joins instantly; the secret lives in the URL fragment so the server never sees it.
				</p>
			</section>
		{/if}

		{#if yourPlan.length > 0 && currentMemberId}
			<section class="plan-section">
				<div class="section-head">
					<div class="eyebrow">Settle up</div>
					<span class="dim mono plan-count">
						{yourPlan.length} {yourPlan.length === 1 ? 'transaction' : 'transactions'}
					</span>
				</div>
				<div class="card plan-list">
					{#each yourPlan as t, i (i)}
						{@const youPay = t.from === currentMemberId}
						<div class="plan-row" class:tone-owe={youPay} class:tone-owed={!youPay}>
							<span class="av av-sm plan-av">
								{((youPay ? membersById.get(t.to)?.name : membersById.get(t.from)?.name) ?? '?')[0].toUpperCase()}
							</span>
							<span class="col plan-text">
								<span class="plan-headline">
									{youPay
										? `Pay ${membersById.get(t.to)?.name ?? '—'}`
										: `${membersById.get(t.from)?.name ?? '—'} pays you`}
								</span>
								<span class="dim plan-sub mono">
									{youPay ? 'OUTGOING' : 'INCOMING'}
								</span>
							</span>
							<span class="num plan-amount">{formatAmount(t.amount, currencySymbol)}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if plan.length > 0}
			<section class="plan-section">
				<div class="section-head">
					<div class="eyebrow">Group plan</div>
					<span class="dim mono plan-count">{plan.length} TOTAL</span>
				</div>
				<div class="card plan-list compact">
					{#each plan as t, i (i)}
						<div class="plan-row compact">
							<span class="num plan-name">{payerName(t.from)}</span>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="plan-arrow">
								<path d="M5 12h14M13 6l6 6-6 6" />
							</svg>
							<span class="num plan-name">{payerName(t.to)}</span>
							<span class="num plan-amount" style="margin-left: auto;">
								{formatAmount(t.amount, currencySymbol)}
							</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<section class="recent-section">
			<div class="section-head">
				<div class="eyebrow">Recent expenses</div>
				<a href="/p/{roomId}/expenses" class="dim mono recent-all">VIEW ALL</a>
			</div>
			{#if recentExpenses.length === 0}
				<div class="card empty-state">
					<p>No expenses yet. Tap the green button to add the first one.</p>
				</div>
			{:else}
				<div class="card recent-list">
					{#each recentExpenses as e, i (e.id)}
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
							showInvolvedCount={false}
						/>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<nav class="tabbar">
		<a href="/p/{roomId}" class="tab active">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11.5L12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.5z" /></svg>
			</div>
			<span>HOME</span>
			<span class="tab-dot"></span>
		</a>
		<a href="/p/{roomId}/expenses" class="tab">
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
		width: 36px;
		height: 36px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		font-size: 22px;
		flex-shrink: 0;
	}

	.project-label {
		gap: 0;
		justify-content: center;
	}

	.project-name {
		font-family: var(--font-sans);
		font-size: 14px;
		text-transform: none;
		letter-spacing: 0;
		color: var(--ink);
	}

	.project-token {
		font-size: 10px;
		letter-spacing: 0.04em;
	}

	.balance-block {
		padding: 24px 0 18px;
		text-align: center;
	}

	.balance-eyebrow {
		margin-bottom: 8px;
	}

	.balance-amount {
		font-family: var(--font-display);
		font-size: 64px;
		line-height: 1;
		letter-spacing: -0.03em;
		font-weight: 400;
	}

	.balance-amount .symbol {
		font-size: 32px;
		vertical-align: top;
		margin-right: 4px;
		opacity: 0.7;
	}

	.balance-sub {
		margin: 12px 0 0;
		font-size: 12px;
		font-family: var(--font-mono);
	}

	.share-card {
		display: flex;
		flex-direction: column;
		margin-bottom: 14px;
	}

	.copy-btn {
		padding: 6px 10px;
		font-size: 12px;
		gap: 6px;
		border-radius: 999px;
		color: var(--ink-2);
	}

	.copy-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.share-url-display {
		margin-top: 12px;
		width: 100%;
		background: transparent;
		border: 1px dashed var(--line-2);
		border-radius: var(--radius-sm);
		padding: 8px 10px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--ink-3);
		outline: none;
	}

	.share-hint {
		font-size: 11px;
		font-family: var(--font-mono);
		line-height: 1.5;
		margin: 10px 0 0;
	}

	.plan-section {
		margin-top: 4px;
	}

	.plan-count {
		font-size: 11px;
	}

	.plan-list {
		padding: 4px;
		display: flex;
		flex-direction: column;
	}

	.plan-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
	}

	.plan-row + .plan-row {
		border-top: 1px solid var(--line);
	}

	.plan-av {
		background: color-mix(in oklab, var(--ink) 12%, transparent);
		color: var(--ink);
	}

	.plan-text {
		flex: 1;
	}

	.plan-headline {
		font-size: 14px;
		font-weight: 600;
	}

	.plan-sub {
		font-size: 10px;
		margin-top: 2px;
		letter-spacing: 0.06em;
	}

	.plan-amount {
		font-weight: 700;
		font-size: 15px;
	}

	.plan-list.compact .plan-row {
		padding: 10px 12px;
		gap: 8px;
	}

	.plan-arrow {
		width: 14px;
		height: 14px;
		color: var(--ink-3);
	}

	.plan-name {
		font-size: 12px;
		font-weight: 500;
	}

	.recent-section {
		margin-top: 4px;
	}

	.recent-all {
		font-size: 11px;
		text-decoration: none;
		color: var(--ink-3);
	}

	.empty-state {
		text-align: center;
		color: var(--ink-2);
		font-size: 13px;
		line-height: 1.5;
		padding: 24px 16px;
	}

	.recent-list {
		padding: 4px;
	}
</style>
