<script lang="ts">
	import Donut from './Donut.svelte';
	import type { DonutSlice } from './Donut.svelte';
	import { formatAmount } from '$lib/money';

	export type CategoryRollup = {
		id: string;
		name: string;
		emoji: string;
		amount: number;
		color: string;
	};

	type Props = {
		rows: CategoryRollup[];
		total: number;
		symbol: string;
		currency: string;
	};

	let { rows, total, symbol, currency }: Props = $props();

	const slices = $derived<DonutSlice[]>(
		rows.map((r) => ({ key: r.id, value: r.amount, color: r.color }))
	);
</script>

<div class="card category-card">
	<div class="row gap-16 category-row">
		<Donut
			{slices}
			centerLabel="TOTAL"
			centerValue={formatAmount(total, symbol, currency)}
		/>
		<div class="col category-list">
			{#each rows as c (c.id)}
				{@const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0}
				<div class="row gap-8 category-row-item">
					<span class="swatch-dot" style="background: {c.color};"></span>
					<span class="category-emoji">{c.emoji}</span>
					<span class="category-name">{c.name}</span>
					<span class="dim mono category-pct">{pct}%</span>
					<span class="num category-amount">{formatAmount(c.amount, symbol, currency)}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.category-card {
		padding: 16px;
	}

	.category-row {
		align-items: center;
	}

	.category-list {
		flex: 1;
		gap: 10px;
		min-width: 0;
	}

	.category-row-item {
		font-size: 12px;
		align-items: center;
		min-width: 0;
	}

	.swatch-dot {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.category-emoji {
		font-size: 14px;
	}

	.category-name {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.category-pct {
		font-size: 10px;
	}

	.category-amount {
		min-width: 56px;
		text-align: right;
		font-weight: 600;
	}
</style>
