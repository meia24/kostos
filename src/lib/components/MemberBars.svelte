<script lang="ts">
	import { formatAmount } from '$lib/money';

	export type MemberContribution = { id: string; name: string; paid: number };

	type Props = {
		rows: MemberContribution[];
		currentMemberId: string | null;
		symbol: string;
		currency: string;
	};

	let { rows, currentMemberId, symbol, currency }: Props = $props();

	const max = $derived(Math.max(1, ...rows.map((r) => r.paid)));
</script>

<div class="card member-card">
	{#each rows as m, i (m.id)}
		{@const pct = (m.paid / max) * 100}
		{@const isYou = m.id === currentMemberId}
		{#if i > 0}<hr class="hairline" style="margin-left: 56px;" />{/if}
		<div class="row gap-10 member-row">
			<span class="av av-sm member-av">{(m.name[0] ?? '?').toUpperCase()}</span>
			<div class="col member-text">
				<div class="member-name">{isYou ? 'You' : m.name}</div>
				<div class="bar-track member-bar">
					<div
						class="bar-fill"
						style="width: {pct}%; background: {isYou ? 'var(--accent)' : 'var(--ink-2)'};"
					></div>
				</div>
			</div>
			<span class="num member-amount">{formatAmount(m.paid, symbol, currency)}</span>
		</div>
	{/each}
</div>

<style>
	.member-card {
		padding: 4px;
	}

	.member-row {
		padding: 12px;
		align-items: center;
	}

	.member-av {
		background: color-mix(in oklab, var(--ink) 14%, transparent);
		color: var(--ink);
	}

	.member-text {
		flex: 1;
		gap: 6px;
		min-width: 0;
	}

	.member-name {
		font-size: 13px;
		font-weight: 600;
	}

	.member-bar {
		margin-top: 0;
	}

	.member-amount {
		min-width: 72px;
		text-align: right;
		font-weight: 600;
		font-size: 13px;
	}
</style>
