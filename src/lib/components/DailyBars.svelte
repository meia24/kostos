<script lang="ts">
	import { formatAmount } from '$lib/money';

	type Bucket = { date: number; total: number };

	type Props = {
		buckets: Bucket[];
		symbol: string;
	};

	let { buckets, symbol }: Props = $props();

	const max = $derived(Math.max(1, ...buckets.map((b) => b.total)));

	function formatDay(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}

	const labels = $derived(() => {
		if (buckets.length === 0) return [];
		const first = formatDay(buckets[0].date);
		const last = formatDay(buckets[buckets.length - 1].date);
		if (buckets.length < 3) return [first, last];
		const mid = formatDay(buckets[Math.floor(buckets.length / 2)].date);
		return [first, mid, last];
	});
</script>

<div class="card daily-card">
	<div class="row between daily-head">
		<div class="eyebrow">Daily spend</div>
		<div class="dim mono daily-range">
			{buckets.length} {buckets.length === 1 ? 'DAY' : 'DAYS'}
		</div>
	</div>
	<div class="daily-bars">
		{#each buckets as b (b.date)}
			{@const heightPct = (b.total / max) * 100}
			{@const isPeak = b.total === max && b.total > 0}
			<div class="daily-col" title="{formatDay(b.date)}: {formatAmount(b.total, symbol)}">
				<div class="daily-bar" class:peak={isPeak} style="height: max(2px, {heightPct}%);"></div>
			</div>
		{/each}
	</div>
	{#if buckets.length > 0}
		<div class="row between daily-axis">
			{#each labels() as label}<span>{label}</span>{/each}
		</div>
	{/if}
</div>

<style>
	.daily-card {
		margin-top: 14px;
	}

	.daily-head {
		margin-bottom: 12px;
	}

	.daily-range {
		font-size: 11px;
	}

	.daily-bars {
		display: flex;
		align-items: flex-end;
		gap: 3px;
		height: 92px;
	}

	.daily-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		min-width: 0;
	}

	.daily-bar {
		width: 100%;
		background: var(--line-2);
		border-radius: 3px;
		transition: background 0.12s ease;
	}

	.daily-bar.peak {
		background: var(--accent);
	}

	.daily-axis {
		margin-top: 8px;
		color: var(--ink-3);
		font-size: 10px;
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
	}
</style>
