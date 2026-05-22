<script lang="ts">
	import { page } from '$app/state';
	import { computeBalances, planSettlements } from '$lib/balance';
	import { PROJECT_COLOR_VALUES, tileBackground } from '$lib/colors';
	import EmptyCard from '$lib/components/EmptyCard.svelte';
	import ExpenseRow from '$lib/components/ExpenseRow.svelte';
	import QrCode from '$lib/components/QrCode.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import TripStrip from '$lib/components/TripStrip.svelte';
	import TripsIntroCard from '$lib/components/TripsIntroCard.svelte';
	import { formatAmount } from '$lib/money';
	import { getCurrentMember, getCurrentProject } from '$lib/storage';
	import type { ConnectionStatus } from '$lib/sync/provider';
	import { useRoom } from '$lib/sync/useRoom.svelte';
	import {
		dismissTripsIntro,
		readTripsIntroDismissed,
		readTripSelection,
		scopeExpenses,
		writeTripSelection
	} from '$lib/trips';
	import type { Expense } from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const room = $derived(useRoom(roomId));
	$effect(() => room.observe());

	const project = $derived(room.project);
	const members = $derived(room.members);
	const expenses = $derived(room.expenses);
	const trips = $derived(room.trips);

	let selectedTripId = $state<string | null>(null);
	$effect(() => {
		// Re-hydrate the per-device selection whenever the room changes, and clear
		// stale references to deleted trips.
		const saved = readTripSelection(roomId);
		if (saved && trips.some((t) => t.id === saved && t.closedAt === undefined)) {
			selectedTripId = saved;
		} else {
			selectedTripId = null;
		}
	});

	function selectTrip(tripId: string | null) {
		selectedTripId = tripId;
		writeTripSelection(roomId, tripId);
	}

	const scopedExpenses = $derived(scopeExpenses(expenses, selectedTripId));
	const selectedTrip = $derived(
		selectedTripId ? (trips.find((t) => t.id === selectedTripId) ?? null) : null
	);

	let copied = $state(false);
	let showShare = $state(false);
	let syncStatus = $state<ConnectionStatus>('idle');

	$effect(() => {
		const offStatus = room.handle.syncProvider?.onStatusChange((s) => (syncStatus = s));
		return () => offStatus?.();
	});

	const syncLabel = $derived.by(() => {
		switch (syncStatus) {
			case 'connected':
				return 'Synced';
			case 'connecting':
				return 'Connecting…';
			case 'reconnecting':
				return 'Reconnecting…';
			case 'offline':
				return 'Offline';
			default:
				return 'Local only';
		}
	});

	const currentMemberId = $derived.by(() => getCurrentMember(roomId));
	const youMember = $derived(members.find((m) => m.id === currentMemberId) ?? null);
	const currencySymbol = $derived(room.currencySymbol);
	const currency = $derived(room.currency);
	const membersById = $derived(room.membersById);
	const categoryById = $derived(room.categoryById);
	const methodById = $derived(room.methodById);

	const balances = $derived(computeBalances(members, scopedExpenses));
	const yourBalance = $derived.by(() => {
		if (!currentMemberId) return 0;
		return balances.find((b) => b.memberId === currentMemberId)?.net ?? 0;
	});
	const plan = $derived(planSettlements(balances));
	const yourPlan = $derived(
		plan.filter((t) => t.from === currentMemberId || t.to === currentMemberId)
	);
	const othersPlan = $derived(
		plan.filter((t) => t.from !== currentMemberId && t.to !== currentMemberId)
	);
	const recentExpenses = $derived(
		[...scopedExpenses].sort((a, b) => b.date - a.date || b.createdAt - a.createdAt).slice(0, 10)
	);
	const hasMoreExpenses = $derived(scopedExpenses.length > recentExpenses.length);

	const expenseCountForTrip = $derived((tripId: string) =>
		expenses.reduce((n, e) => (e.tripId === tripId ? n + 1 : n), 0)
	);

	let introDismissed = $state(false);
	$effect(() => {
		introDismissed = readTripsIntroDismissed(roomId);
	});

	const showTripsIntro = $derived(trips.length === 0 && !introDismissed);

	function dismissIntro() {
		dismissTripsIntro(roomId);
		introDismissed = true;
	}
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

</script>

<svelte:head>
	<title>{project?.name ? `${project.name} · Kostos` : 'Kostos'}</title>
</svelte:head>

<div class="screen" data-page="dashboard">
	<header class="app-bar">
		<a class="project-link row gap-8" href="/" aria-label="Switch group" title="Switch group">
			<span
				class="project-tile"
				style={project
					? `background: ${tileBackground(project.color)}; color: ${PROJECT_COLOR_VALUES[project.color]};`
					: ''}
			>
				{project?.emoji ?? '🏖'}
			</span>
			<span class="project-label col">
				<span class="app-bar-title project-name">
					{project?.name ?? 'Loading'}
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						class="switch-chevron"
						aria-hidden="true"
					>
						<path d="M6 9l6 6 6-6" />
					</svg>
				</span>
				<span class="dim mono project-token">
					<span class="sync-dot" data-state={syncStatus} aria-hidden="true"></span>
					<span class="sync-text" title={syncLabel}>{roomId}</span>
				</span>
			</span>
		</a>
		<div class="row gap-6" style="flex: 0; justify-content: flex-end;">
			<a class="icon-btn" href="/p/{roomId}/settle" aria-label="Settle up" title="Settle up">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 4v16M6 7h12M4 11l2-4 2 4a2 2 0 1 1-4 0zM16 11l2-4 2 4a2 2 0 1 1-4 0z" />
				</svg>
			</a>
			<button class="icon-btn" aria-label="Share" onclick={() => (showShare = !showShare)}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 4v12M8 8l4-4 4 4M5 14v5h14v-5" /></svg>
			</button>
			<a class="icon-btn" href="/p/{roomId}/settings" aria-label="Project settings" title="Project settings">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
					<circle cx="12" cy="12" r="2.6" />
					<path d="M19 12a7 7 0 0 0-.16-1.5l2.05-1.58-2-3.46-2.43.83a7 7 0 0 0-2.59-1.5L13.5 2h-3l-.37 2.79a7 7 0 0 0-2.59 1.5l-2.43-.83-2 3.46L5.16 10.5A7 7 0 0 0 5 12a7 7 0 0 0 .16 1.5l-2.05 1.58 2 3.46 2.43-.83a7 7 0 0 0 2.59 1.5L10.5 22h3l.37-2.79a7 7 0 0 0 2.59-1.5l2.43.83 2-3.46-2.05-1.58A7 7 0 0 0 19 12z" />
				</svg>
			</a>
		</div>
	</header>

	<div class="scroll">
		<TripStrip
			{trips}
			{selectedTripId}
			expenseCountAll={expenses.length}
			{expenseCountForTrip}
			onSelect={selectTrip}
			manageHref="/p/{roomId}/settings/trips"
		/>

		<section class="balance-block">
			<div class="eyebrow balance-eyebrow">
				{balanceEyebrow(yourBalance)}
				{#if selectedTrip}
					<span class="scope-tag">· {selectedTrip.emoji} {selectedTrip.name}</span>
				{/if}
			</div>
			<div class="balance-amount" class:tone-owed={yourBalance > 0} class:tone-owe={yourBalance < 0}>
				<span class="symbol">{currencySymbol}</span>{formatAmount(Math.abs(yourBalance), '', currency)}
			</div>
			{#if youMember}
				<p class="dim balance-sub">as <strong>{youMember.name}</strong></p>
			{:else}
				<p class="dim balance-sub">No member claimed on this device.</p>
			{/if}
		</section>

		{#if showTripsIntro}
			<TripsIntroCard manageHref="/p/{roomId}/settings/trips" onDismiss={dismissIntro} />
		{/if}

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
					<div class="qr-wrap">
						<QrCode value={shareUrl} size={200} />
						<p class="dim mono qr-caption">SCAN TO JOIN</p>
					</div>
					<input id="share-url-display" class="share-url-display" value={shareUrl} readonly />
				{/if}
				<p class="dim share-hint">
					Anyone with this link joins instantly; the secret lives in the URL fragment so the server never sees it.
				</p>
			</section>
		{/if}

		{#if plan.length > 0}
			<section class="plan-section">
				<a class="section-head plan-link" href="/p/{roomId}/settle">
					<div class="eyebrow">Settle up</div>
					<span class="dim mono plan-count">
						{plan.length} {plan.length === 1 ? 'transfer' : 'transfers'}
						<span class="plan-chevron" aria-hidden="true">›</span>
					</span>
				</a>
				{#if yourPlan.length > 0 && currentMemberId}
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
								<span class="num plan-amount">{formatAmount(t.amount, currencySymbol, currency)}</span>
							</div>
						{/each}
					</div>
				{/if}
				{#if othersPlan.length > 0}
					<a class="others-link" href="/p/{roomId}/settle">
						<span class="dim mono">
							{#if yourPlan.length === 0}
								You're clear ·
							{/if}
							{othersPlan.length} {othersPlan.length === 1 ? 'transfer' : 'transfers'} between others
						</span>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
					</a>
				{/if}
			</section>
		{/if}

		<section class="recent-section">
			<div class="section-head">
				<div class="eyebrow">Recent expenses</div>
				<a href="/p/{roomId}/expenses" class="dim mono recent-all">VIEW ALL</a>
			</div>
			{#if recentExpenses.length === 0}
				<EmptyCard>
					<p>No expenses yet. Tap the green button to add the first one.</p>
				</EmptyCard>
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
							{currency}
							totalMembers={members.length}
							showInvolvedCount={false}
						/>
					{/each}
					{#if hasMoreExpenses}
						<hr class="hairline" style="margin-left: 56px;" />
						<a class="see-all-row" href="/p/{roomId}/expenses">
							<span>See all expenses</span>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
						</a>
					{/if}
				</div>
			{/if}
		</section>
	</div>

	<TabBar {roomId} active="home" />
</div>

<style>
	.project-link {
		flex: 1;
		align-items: center;
		text-decoration: none;
		color: inherit;
	}

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
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.switch-chevron {
		width: 12px;
		height: 12px;
		color: var(--ink-3);
	}

	.project-token {
		font-size: 10px;
		letter-spacing: 0.04em;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.sync-dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--ink-3);
		flex-shrink: 0;
	}

	.sync-dot[data-state='connected'] {
		background: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 25%, transparent);
	}

	.sync-dot[data-state='connecting'],
	.sync-dot[data-state='reconnecting'] {
		background: var(--warn);
		animation: sync-pulse 1.4s ease-in-out infinite;
	}

	.sync-dot[data-state='offline'] {
		background: var(--owe);
	}

	@keyframes sync-pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}

	.balance-block {
		padding: 24px 0 18px;
		text-align: center;
	}

	.balance-eyebrow {
		margin-bottom: 8px;
	}

	.scope-tag {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 500;
		text-transform: none;
		letter-spacing: 0;
		color: var(--accent);
		margin-left: 4px;
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

	.qr-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		margin: 16px auto 4px;
	}

	.qr-caption {
		font-size: 10px;
		letter-spacing: 0.08em;
		margin: 0;
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

	.plan-link {
		text-decoration: none;
		color: inherit;
	}

	.plan-chevron {
		display: inline-block;
		margin-left: 4px;
		font-size: 13px;
		opacity: 0.6;
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

	.others-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 14px;
		margin-top: 8px;
		background: transparent;
		border: 1px dashed var(--line-2);
		border-radius: var(--radius);
		color: var(--ink-2);
		text-decoration: none;
		font-size: 12px;
		transition: border-color 0.12s ease, color 0.12s ease;
	}

	.others-link:hover {
		border-color: var(--accent);
		color: var(--ink);
	}

	.others-link svg {
		width: 14px;
		height: 14px;
		color: var(--ink-3);
	}

	.recent-section {
		margin-top: 4px;
	}

	.recent-all {
		font-size: 11px;
		text-decoration: none;
		color: var(--ink-3);
	}

	.recent-list {
		padding: 4px;
	}

	.see-all-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 14px 18px;
		text-decoration: none;
		color: var(--accent);
		font-weight: 600;
		font-size: 13px;
	}

	.see-all-row svg {
		width: 16px;
		height: 16px;
		opacity: 0.8;
	}
</style>
