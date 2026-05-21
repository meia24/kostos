<script lang="ts">
	import { formatAmount } from '$lib/money';

	type Bucket = { date: number; total: number };
	type BucketSize = 'day' | 'week' | 'month';

	type Props = {
		buckets: Bucket[];
		bucketSize?: BucketSize;
		symbol: string;
		currency: string;
	};

	let { buckets, bucketSize = 'day', symbol, currency }: Props = $props();

	const max = $derived(Math.max(1, ...buckets.map((b) => b.total)));

	const headTitle = $derived(
		bucketSize === 'month'
			? 'Monthly spend'
			: bucketSize === 'week'
				? 'Weekly spend'
				: 'Daily spend'
	);

	const headCount = $derived(
		bucketSize === 'month'
			? `${buckets.length} ${buckets.length === 1 ? 'MONTH' : 'MONTHS'}`
			: bucketSize === 'week'
				? `${buckets.length} ${buckets.length === 1 ? 'WEEK' : 'WEEKS'}`
				: `${buckets.length} ${buckets.length === 1 ? 'DAY' : 'DAYS'}`
	);

	function formatBucket(ts: number, size: BucketSize): string {
		const d = new Date(ts);
		if (size === 'month') {
			return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
		}
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}

	const labels = $derived(() => {
		if (buckets.length === 0) return [];
		const first = formatBucket(buckets[0].date, bucketSize);
		const last = formatBucket(buckets[buckets.length - 1].date, bucketSize);
		if (buckets.length < 3) return [first, last];
		const mid = formatBucket(buckets[Math.floor(buckets.length / 2)].date, bucketSize);
		return [first, mid, last];
	});

	const tooltip = (b: Bucket): string =>
		`${formatBucket(b.date, bucketSize)}: ${formatAmount(b.total, symbol, currency)}`;
</script>

<div class="card daily-card">
	<div class="row between daily-head">
		<div class="eyebrow">{headTitle}</div>
		<div class="dim mono daily-range">{headCount}</div>
	</div>
	<div class="daily-bars">
		{#each buckets as b (b.date)}
			{@const heightPct = (b.total / max) * 100}
			{@const isPeak = b.total === max && b.total > 0}
			<div class="daily-col" title={tooltip(b)}>
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
		align-items: stretch;
		gap: 2px;
		height: 92px;
	}

	.daily-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		min-width: 1px;
		height: 100%;
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
