<script lang="ts">
	import { CURRENCY_PRESETS } from '$lib/currencies';
	import { formatAmount } from '$lib/money';
	import type { ActivityChange, ActivityEvent, Member } from '$lib/types';
	import Avatar from './Avatar.svelte';

	type Props = {
		event: ActivityEvent;
		membersById: Map<string, Member>;
		currentMemberId: string | null;
		/** when set, expense events link to the expense (a deleted one has nowhere to go) */
		roomId?: string;
	};

	let { event, membersById, currentMemberId, roomId }: Props = $props();

	const href = $derived(
		roomId && event.expenseId && event.kind !== 'expense.remove'
			? `/p/${roomId}/expenses/${event.expenseId}`
			: undefined
	);

	const actor = $derived(event.by ? membersById.get(event.by) : undefined);
	const actorName = $derived(
		event.by && event.by === currentMemberId ? 'You' : (actor?.name ?? 'Someone')
	);
	function money(cents: number | undefined, currency: string | undefined): string {
		if (cents === undefined || !currency) return '';
		const sym = CURRENCY_PRESETS.find((p) => p.code === currency)?.sym ?? currency;
		return formatAmount(cents, sym, currency);
	}

	function shortDate(ms: number): string {
		return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}

	function payerNames(ids: string[]): string {
		const names = ids.map((id) => membersById.get(id)?.name ?? '—');
		if (names.length === 0) return '—';
		if (names.length === 1) return names[0];
		if (names.length === 2) return `${names[0]} & ${names[1]}`;
		return `${names[0]} +${names.length - 1}`;
	}

	function formatChange(c: ActivityChange): string {
		switch (c.kind) {
			case 'amount':
				return `${money(c.from, c.fromCurrency)} → ${money(c.to, c.toCurrency)}`;
			case 'text':
				return `“${c.from || '—'}” → “${c.to || '—'}”`;
			case 'date':
				return `${shortDate(c.from)} → ${shortDate(c.to)}`;
			case 'paidBy':
				return c.from && c.to ? `${payerNames(c.from)} → ${payerNames(c.to)}` : 'paid by';
			case 'split':
				return c.from && c.to ? `${c.from} → ${c.to}` : 'split';
		}
	}

	// surface whatever changed, amount first, then anything else, with a "+N" tail
	const editDetail = $derived.by(() => {
		const changes = event.changes ?? [];
		if (changes.length === 0) return '';
		const primary = changes.find((c) => c.kind === 'amount') ?? changes[0];
		const core = formatChange(primary);
		return changes.length > 1 ? `${core} +${changes.length - 1}` : core;
	});

	const message = $derived.by(() => {
		const label = event.label ?? 'item';
		switch (event.kind) {
			case 'expense.add':
				return `added “${label}” · ${money(event.amount, event.currency)}`;
			case 'expense.edit': {
				const changes = event.changes ?? [];
				const lone = changes[0];
				if (changes.length === 1 && lone.kind === 'text') {
					return `renamed ${formatChange(lone)}`;
				}
				return editDetail ? `edited “${label}” · ${editDetail}` : `edited “${label}”`;
			}
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
				return c && c.kind === 'text' ? `renamed ${c.from} → ${c.to}` : 'renamed a member';
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

<svelte:element this={href ? 'a' : 'div'} {href} class="activity-row" class:linked={!!href}>
	<Avatar member={actor} size="sm" />
	<span class="activity-text"><span class="actor">{actorName}</span> {message}</span>
	<span class="activity-time mono dim">{relTime(event.at)}</span>
</svelte:element>

<style>
	.activity-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 4px;
		color: inherit;
		text-decoration: none;
	}

	.activity-row.linked {
		cursor: pointer;
	}

	.activity-row.linked:active {
		opacity: 0.6;
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
