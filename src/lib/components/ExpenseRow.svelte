<script lang="ts">
	import { expenseShares } from '$lib/balance';
	import { formatAmount, formatSigned } from '$lib/money';
	import type {
		Category,
		Expense,
		Member,
		PaymentMethodItem
	} from '$lib/types';

	type Props = {
		expense: Expense;
		href: string;
		membersById: Map<string, Member>;
		categoryById: Map<string, Category>;
		methodById: Map<string, PaymentMethodItem>;
		currentMemberId: string | null;
		symbol: string;
		totalMembers: number;
		showDate?: boolean;
		showInvolvedCount?: boolean;
	};

	let {
		expense,
		href,
		membersById,
		categoryById,
		methodById,
		currentMemberId,
		symbol,
		totalMembers,
		showDate = true,
		showInvolvedCount = true
	}: Props = $props();

	const category = $derived(
		expense.categoryId ? categoryById.get(expense.categoryId) : undefined
	);
	const method = $derived(
		expense.paymentMethodId ? methodById.get(expense.paymentMethodId) : undefined
	);

	function payerName(id: string): string {
		const m = membersById.get(id);
		if (!m) return '—';
		return m.id === currentMemberId ? 'You' : m.name;
	}

	const payersLabel = $derived.by(() => {
		if (expense.payments.length === 0) return '—';
		const first = payerName(expense.payments[0].memberId);
		const verb = expense.payments[0].memberId === currentMemberId ? 'paid' : 'paid';
		if (expense.payments.length === 1) return `${first} ${verb}`;
		if (expense.payments.length === 2) {
			return `${first} & ${payerName(expense.payments[1].memberId)} ${verb}`;
		}
		return `${first} + ${expense.payments.length - 1} others ${verb}`;
	});

	const yourImpact = $derived.by(() => {
		if (!currentMemberId) return 0;
		const paid = expense.payments
			.filter((p) => p.memberId === currentMemberId)
			.reduce((sum, p) => sum + p.amount, 0);
		const share = expenseShares(expense).get(currentMemberId) ?? 0;
		return paid - share;
	});

	const inExpense = $derived(
		!!currentMemberId && expense.splits.some((s) => s.memberId === currentMemberId)
	);

	function shortDate(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<a class="expense-row" {href}>
	<span class="cat-tile row-cat">{category?.emoji ?? '📦'}</span>
	<span class="col row-text">
		<span class="row title-row">
			<span class="row-title">{expense.description || 'Expense'}</span>
			{#if expense.splitMode === 'shares'}
				<span class="sticker mode-sticker">SHARES</span>
			{:else if expense.splitMode === 'amount'}
				<span class="sticker mode-sticker">AMOUNTS</span>
			{/if}
		</span>
		<span class="dim mono row-meta">
			{#if showDate}<span>{shortDate(expense.date)}</span><span class="dot">·</span>{/if}
			<span>{payersLabel}</span>
			{#if method}
				<span class="dot">·</span>
				<span class="row-method" title={method.name}>{method.emoji}</span>
			{/if}
			{#if showInvolvedCount}
				<span class="dot">·</span>
				<span>{expense.splits.length}/{totalMembers}</span>
			{/if}
		</span>
	</span>
	<span class="col row-amount-col">
		<span class="num row-amount">{formatAmount(expense.amount, symbol)}</span>
		{#if currentMemberId}
			{#if !inExpense && yourImpact === 0}
				<span class="dim mono row-impact">not in</span>
			{:else if yourImpact !== 0}
				<span
					class="num mono row-impact"
					class:tone-owed={yourImpact > 0}
					class:tone-owe={yourImpact < 0}
				>{formatSigned(yourImpact, symbol)}</span>
			{/if}
		{/if}
	</span>
</a>

<style>
	.expense-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 12px;
		text-decoration: none;
		color: inherit;
	}

	.row-cat {
		font-size: 20px;
		flex-shrink: 0;
	}

	.row-text {
		flex: 1;
		min-width: 0;
		gap: 2px;
	}

	.title-row {
		align-items: center;
		gap: 6px;
	}

	.row-title {
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mode-sticker {
		padding: 2px 6px;
		font-size: 9px;
	}

	.row-meta {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		font-size: 11px;
	}

	.dot {
		opacity: 0.6;
	}

	.row-method {
		font-size: 13px;
		line-height: 1;
	}

	.row-amount-col {
		align-items: flex-end;
		gap: 2px;
		flex-shrink: 0;
	}

	.row-amount {
		font-weight: 600;
		font-size: 14px;
	}

	.row-impact {
		font-size: 11px;
	}
</style>
