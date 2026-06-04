<script lang="ts">
	import { CURRENCY_PRESETS } from '$lib/currencies';
	import { formatAmount } from '$lib/money';
	import type { ActivityEvent, Member } from '$lib/types';
	import Avatar from './Avatar.svelte';

	type Props = {
		event: ActivityEvent;
		membersById: Map<string, Member>;
		currentMemberId: string | null;
	};

	let { event, membersById, currentMemberId }: Props = $props();

	const actor = $derived(event.by ? membersById.get(event.by) : undefined);
	const actorName = $derived(
		event.by && event.by === currentMemberId ? 'You' : (actor?.name ?? 'Someone')
	);
	const amountChange = $derived(event.changes?.find((c) => c.field === 'amount'));

	function money(cents: number | undefined, currency: string | undefined): string {
		if (cents === undefined || !currency) return '';
		const sym = CURRENCY_PRESETS.find((p) => p.code === currency)?.sym ?? currency;
		return formatAmount(cents, sym, currency);
	}

	const message = $derived.by(() => {
		const label = event.label ?? 'item';
		switch (event.kind) {
			case 'expense.add':
				return `added “${label}” · ${money(event.amount, event.currency)}`;
			case 'expense.edit':
				return amountChange
					? `edited “${label}” · ${amountChange.from} → ${amountChange.to}`
					: `edited “${label}”`;
			case 'expense.remove':
				return `deleted “${label}”`;
			case 'settle.add': {
				const to = event.memberId ? (membersById.get(event.memberId)?.name ?? 'someone') : 'someone';
				return `settled ${money(event.amount, event.currency)} to ${to}`;
			}
			case 'member.add':
				return `added ${label}`;
			case 'member.remove':
				return `removed ${label}`;
			case 'member.rename': {
				const c = event.changes?.[0];
				return c ? `renamed ${c.from} → ${c.to}` : 'renamed a member';
			}
			default:
				return '';
		}
	});

	function relTime(at: number): string {
		const secs = Math.max(0, Math.round((Date.now() - at) / 1000));
		if (secs < 60) return 'now';
		const mins = Math.round(secs / 60);
		if (mins < 60) return `${mins}m`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `${hours}h`;
		const days = Math.round(hours / 24);
		if (days < 7) return `${days}d`;
		return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}
</script>

<div class="activity-row">
	<Avatar member={actor} size="sm" />
	<span class="activity-text"><span class="actor">{actorName}</span> {message}</span>
	<span class="activity-time mono dim">{relTime(event.at)}</span>
</div>

<style>
	.activity-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 4px;
	}

	.activity-text {
		flex: 1;
		min-width: 0;
		font-size: 13px;
		color: var(--ink-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.actor {
		color: var(--ink);
		font-weight: 600;
	}

	.activity-time {
		flex-shrink: 0;
		font-size: 11px;
	}
</style>
