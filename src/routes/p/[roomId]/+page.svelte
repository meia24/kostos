<script lang="ts">
	import { page } from '$app/state';
	import { computeBalances, planSettlements } from '$lib/balance';
	import ExpenseRow from '$lib/components/ExpenseRow.svelte';
	import ProjectAppBar from '$lib/components/ProjectAppBar.svelte';
	import SettlementGraph from '$lib/components/SettlementGraph.svelte';
	import SettlePanel from '$lib/components/SettlePanel.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import { formatAmount } from '$lib/money';
	import { getCurrentMember, updateProjectMetadata } from '$lib/storage';
	import { useRoom } from '$lib/sync/useRoom.svelte';

	const roomId = $derived(page.params.roomId ?? '');
	const room = $derived(useRoom(roomId));
	$effect(() => room.observe());

	const project = $derived(room.project);
	const members = $derived(room.members);
	const expenses = $derived(room.expenses);

	const currentMemberId = $derived.by(() => getCurrentMember(roomId));
	const youMember = $derived(members.find((m) => m.id === currentMemberId) ?? null);
	const currencySymbol = $derived(room.currencySymbol);
	const currency = $derived(room.currency);
	const membersById = $derived(room.membersById);

	const balances = $derived(computeBalances(members, expenses, room.currency));
	const yourBalance = $derived.by(() => {
		if (!currentMemberId) return 0;
		return balances.find((b) => b.memberId === currentMemberId)?.net ?? 0;
	});
	const plan = $derived(planSettlements(balances));

	// cache your net so the home list can show it without opening every room.
	// only once an identity is claimed here, since "your" balance needs it.
	$effect(() => {
		if (!currentMemberId) return;
		updateProjectMetadata(roomId, {
			net: yourBalance,
			netCurrency: currency,
			netSymbol: currencySymbol
		});
	});

	// most recently added (createdAt, not date) so the peek surfaces fresh activity
	// from other members, which is the whole point of showing it here
	const recentExpenses = $derived(
		[...expenses].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)
	);

	// Gate on the people actually in the plan, not the whole group, and cap it so the
	// two-column flow stays a comfortable height on a phone.
	const MAX_GRAPH_PARTICIPANTS = 10;
	const planParticipants = $derived(new Set(plan.flatMap((t) => [t.from, t.to])).size);
	const showGraph = $derived(plan.length > 0 && planParticipants <= MAX_GRAPH_PARTICIPANTS);

	// Whoever owes the most should front the next expense; it nudges the group back to even.
	const bestPayer = $derived.by(() => {
		let lowest: { memberId: string; net: number } | null = null;
		for (const b of balances) {
			if (lowest === null || b.net < lowest.net) lowest = b;
		}
		if (!lowest || lowest.net >= 0) return null;
		return membersById.get(lowest.memberId) ?? null;
	});

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
	<ProjectAppBar {roomId} {project} handle={room.handle} />

	<div class="scroll">
		{#if showGraph}
			<div class="graph-wrap">
				<SettlementGraph {members} {plan} {currentMemberId} symbol={currencySymbol} {currency} />
			</div>
		{/if}

		<section class="balance-block">
			<div class="eyebrow balance-eyebrow">{balanceEyebrow(yourBalance)}</div>
			<div
				class="balance-amount"
				class:tone-owed={yourBalance > 0}
				class:tone-owe={yourBalance < 0}
			>
				<span class="symbol">{currencySymbol}</span>{formatAmount(Math.abs(yourBalance), '', currency)}
			</div>
			{#if !youMember}
				<p class="dim balance-sub">No member claimed on this device.</p>
			{/if}
		</section>

		{#if bestPayer}
			<div class="tip">
				<span class="tip-icon" aria-hidden="true">💡</span>
				<span>
					<strong>{bestPayer.id === currentMemberId ? 'You' : bestPayer.name}</strong>
					should pay the next expense
				</span>
			</div>
		{/if}

		{#if plan.length > 0}
			<div class="section-head settle-head">
				<div class="eyebrow">Settle up</div>
				<span class="dim mono plan-count">tap any to settle</span>
			</div>
			<SettlePanel
				{roomId}
				handle={room.handle}
				{project}
				{membersById}
				{plan}
				{currentMemberId}
				symbol={currencySymbol}
				{currency}
			/>
		{:else}
			<div class="all-settled">
				<span class="settled-icon" aria-hidden="true">🎉</span>
				<span>Everyone is settled up</span>
			</div>
		{/if}

		{#if recentExpenses.length > 0}
			<div class="section-head recent-head">
				<div class="eyebrow">Recent activity</div>
				<a class="mono see-all" href="/p/{roomId}/expenses">See all</a>
			</div>
			<div class="card recent-card">
				{#each recentExpenses as e, i (e.id)}
					{#if i > 0}<hr class="hairline" style="margin-left: 56px;" />{/if}
					<ExpenseRow
						expense={e}
						href="/p/{roomId}/expenses/{e.id}"
						membersById={room.membersById}
						categoryById={room.categoryById}
						methodById={room.methodById}
						tripsById={room.tripsById}
						{currentMemberId}
						symbol={currencySymbol}
						{currency}
						totalMembers={members.length}
						showInvolvedCount={false}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<TabBar {roomId} active="home" />
</div>

<style>
	.graph-wrap {
		margin: 4px 0 0;
		padding: 0 4px;
	}

	.balance-block {
		padding: 2px 0 16px;
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

	.tip {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		margin-bottom: 14px;
		border: 1px dashed var(--line-2);
		border-radius: var(--radius);
		font-size: 13px;
		color: var(--ink-2);
	}

	.tip strong {
		color: var(--ink);
	}

	.tip-icon {
		font-size: 15px;
	}

	.settle-head {
		margin-bottom: 8px;
	}

	.recent-head {
		margin: 22px 0 8px;
	}

	/* tight padding so rows + their hairlines line up like the expenses list */
	.recent-card {
		padding: 4px;
	}

	.see-all {
		font-size: 11px;
		color: var(--accent);
		text-decoration: none;
	}

	.plan-count {
		font-size: 11px;
	}

	.all-settled {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px 0;
		color: var(--ink-2);
		font-size: 14px;
	}

	.settled-icon {
		font-size: 18px;
	}
</style>
