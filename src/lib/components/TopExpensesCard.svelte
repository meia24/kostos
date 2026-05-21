<script lang="ts">
	import { formatAmount } from '$lib/money';
	import type { Category, Expense, Member } from '$lib/types';

	type Props = {
		expenses: Expense[];
		categoryById: Map<string, Category>;
		membersById: Map<string, Member>;
		currentMemberId: string | null;
		symbol: string;
		currency: string;
		hrefBase: string;
	};

	let {
		expenses,
		categoryById,
		membersById,
		currentMemberId,
		symbol,
		currency,
		hrefBase
	}: Props = $props();

	function formatDay(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}
</script>

<div class="card top-card">
	{#each expenses as e, i (e.id)}
		{@const cat = e.categoryId ? categoryById.get(e.categoryId) : undefined}
		{@const payerName = membersById.get(e.payments[0]?.memberId ?? '')?.name ?? '—'}
		{#if i > 0}<hr class="hairline" style="margin-left: 56px;" />{/if}
		<a class="top-row" href="{hrefBase}/{e.id}">
			<span class="cat-tile top-cat">{cat?.emoji ?? '📦'}</span>
			<div class="col top-text">
				<span class="top-title">{e.description || 'Expense'}</span>
				<span class="dim mono top-meta">
					{formatDay(e.date)} · {e.payments[0]?.memberId === currentMemberId ? 'You' : payerName} paid
				</span>
			</div>
			<span class="num top-amount">{formatAmount(e.amount, symbol, currency)}</span>
		</a>
	{/each}
</div>

<style>
	.top-card {
		padding: 4px;
	}

	.top-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		text-decoration: none;
		color: inherit;
	}

	.top-cat {
		font-size: 20px;
		flex-shrink: 0;
	}

	.top-text {
		flex: 1;
		min-width: 0;
	}

	.top-title {
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.top-meta {
		font-size: 11px;
		margin-top: 2px;
	}

	.top-amount {
		font-weight: 700;
		font-size: 14px;
	}
</style>
