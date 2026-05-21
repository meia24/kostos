<script lang="ts">
	import { untrack } from 'svelte';
	import AmountField from './AmountField.svelte';
	import EmojiPickerField from './EmojiPickerField.svelte';
	import type { EmojiItem } from './EmojiPickerField.svelte';
	import PaidBySection from './PaidBySection.svelte';
	import ScreenAppBar from './ScreenAppBar.svelte';
	import type { PaymentRow } from './PaidBySection.svelte';
	import SplitSection from './SplitSection.svelte';
	import { expenseShares, splitEvenly } from '$lib/balance';
	import { evalToCents } from '$lib/math';
	import type {
		Category,
		Expense,
		ExpenseSplit,
		Member,
		PaymentMethodItem,
		Project,
		SplitMode
	} from '$lib/types';

	type Props = {
		project: Project;
		members: Member[];
		currentMemberId: string | null;
		mode: 'create' | 'edit';
		initial?: Expense;
		onSave: (expense: Expense) => void | Promise<void>;
		onCancel: () => void;
		onAddCategory: (item: Category) => void;
		onAddPaymentMethod: (item: PaymentMethodItem) => void;
		generateId: () => string;
	};

	let {
		project,
		members,
		currentMemberId,
		mode,
		initial,
		onSave,
		onCancel,
		onAddCategory,
		onAddPaymentMethod,
		generateId
	}: Props = $props();

	const headerTitle = untrack(() => (mode === 'edit' ? 'Edit expense' : 'New expense'));
	const saveLabel = untrack(() => (mode === 'edit' ? 'Update' : 'Save'));

	const seed = untrack(() => initial);

	function seedAmountInput(): string {
		return seed ? (seed.amount / 100).toFixed(2) : '';
	}

	function seedDateStr(): string {
		const t = seed?.date ?? Date.now();
		return new Date(t).toISOString().slice(0, 10);
	}

	function seedPayers(): PaymentRow[] {
		if (!seed) {
			return [
				{
					id: generateId(),
					memberId: currentMemberId ?? members[0]?.id ?? '',
					amount: ''
				}
			];
		}
		if (seed.payments.length === 1) {
			return [{ id: generateId(), memberId: seed.payments[0].memberId, amount: '' }];
		}
		return seed.payments.map((p) => ({
			id: generateId(),
			memberId: p.memberId,
			amount: (p.amount / 100).toFixed(2)
		}));
	}

	function seedInvolved(): Set<string> {
		if (seed) return new Set(seed.splits.map((s) => s.memberId));
		return new Set(members.map((m) => m.id));
	}

	function seedShares(): Record<string, number> {
		const out: Record<string, number> = {};
		for (const m of members) out[m.id] = 1;
		if (seed?.splitMode === 'shares') {
			for (const s of seed.splits) out[s.memberId] = s.shares ?? 1;
		}
		return out;
	}

	function seedAmounts(): Record<string, string> {
		const out: Record<string, string> = {};
		for (const m of members) out[m.id] = '';
		if (seed?.splitMode === 'amount') {
			for (const s of seed.splits) {
				out[s.memberId] = ((s.amount ?? 0) / 100).toFixed(2);
			}
		}
		return out;
	}

	let amountInput = $state(seedAmountInput());
	let amountCents = $state(seed?.amount ?? 0);
	let title = $state(seed?.description ?? '');
	let dateStr = $state(seedDateStr());
	let payers = $state<PaymentRow[]>(seedPayers());
	let splitMode = $state<SplitMode>(seed?.splitMode ?? 'even');
	let involved = $state<Set<string>>(seedInvolved());
	let shares = $state<Record<string, number>>(seedShares());
	let amounts = $state<Record<string, string>>(seedAmounts());
	let notes = $state(seed?.notes ?? '');
	let categoryId = $state<string | undefined>(seed?.categoryId);
	let paymentMethodId = $state<string | undefined>(seed?.paymentMethodId);
	let submitting = $state(false);

	$effect(() => {
		const raw = amountInput.trim();
		if (raw === '') {
			amountCents = 0;
			return;
		}
		const evaluated = evalToCents(raw);
		if (evaluated !== null && evaluated >= 0) amountCents = evaluated;
	});

	const isExpression = $derived(/[+\-*/()]/.test(amountInput.trim()));
	const currencySymbol = $derived(project.currencySymbol);
	const currency = $derived(project.currency);
	const involvedList = $derived(members.filter((m) => involved.has(m.id)));

	const payerCents = $derived(payers.map((p) => evalToCents(p.amount) ?? 0));
	const paidTotal = $derived(payerCents.reduce((sum, c) => sum + c, 0));
	const paidShort = $derived(amountCents - paidTotal);
	const isMultiPayer = $derived(payers.length > 1);
	const paymentsValid = $derived(
		payers.length > 0 &&
			payers.every((p) => p.memberId) &&
			(!isMultiPayer || (paidTotal === amountCents && payerCents.every((c) => c > 0)))
	);

	const canSave = $derived(
		amountCents > 0 && title.trim().length > 0 && paymentsValid && involvedList.length > 0
	);

	function buildSplits(): ExpenseSplit[] {
		if (splitMode === 'even') return involvedList.map((m) => ({ memberId: m.id }));
		if (splitMode === 'shares') {
			return involvedList.map((m) => ({ memberId: m.id, shares: shares[m.id] ?? 0 }));
		}
		return involvedList.map((m) => ({
			memberId: m.id,
			amount: evalToCents(amounts[m.id] ?? '') ?? 0
		}));
	}

	const previewExpense: Expense | null = $derived.by(() => {
		if (amountCents <= 0 || involvedList.length === 0) return null;
		const fallback = payers[0]?.memberId || members[0]?.id || '';
		return {
			id: 'preview',
			payments: [{ memberId: fallback, amount: amountCents }],
			amount: amountCents,
			currency: project.currency,
			date: Date.now(),
			splitMode,
			splits: buildSplits(),
			createdAt: Date.now(),
			createdBy: fallback
		};
	});

	const memberShares = $derived(
		previewExpense ? expenseShares(previewExpense) : new Map<string, number>()
	);
	const assignedAmount = $derived.by(() => {
		if (splitMode !== 'amount') return amountCents;
		return involvedList.reduce((sum, m) => sum + (evalToCents(amounts[m.id] ?? '') ?? 0), 0);
	});
	const remaining = $derived(amountCents - assignedAmount);
	const totalShares = $derived(involvedList.reduce((sum, m) => sum + (shares[m.id] ?? 0), 0));
	const emptyInvolvedCount = $derived(
		splitMode === 'amount'
			? involvedList.filter((m) => (evalToCents(amounts[m.id] ?? '') ?? 0) === 0).length
			: 0
	);
	const canAutoFill = $derived(
		splitMode === 'amount' && amountCents > 0 && remaining > 0 && emptyInvolvedCount > 0
	);

	function setPayerRow(id: string, updates: Partial<PaymentRow>) {
		payers = payers.map((p) => (p.id === id ? { ...p, ...updates } : p));
	}

	function nextAvailableMember(): string {
		const taken = new Set(payers.map((p) => p.memberId));
		const free = members.find((m) => !taken.has(m.id));
		return free?.id ?? members[0]?.id ?? '';
	}

	function addPayer() {
		if (payers.length === 0) {
			payers = [
				{ id: generateId(), memberId: currentMemberId ?? members[0]?.id ?? '', amount: '' }
			];
			return;
		}
		if (payers.length === 1) {
			payers = [
				{ ...payers[0], amount: (amountCents / 100).toFixed(2) },
				{ id: generateId(), memberId: nextAvailableMember(), amount: '' }
			];
			return;
		}
		payers = [...payers, { id: generateId(), memberId: nextAvailableMember(), amount: '' }];
	}

	function removePayer(id: string) {
		if (payers.length <= 1) return;
		payers = payers.filter((p) => p.id !== id);
		if (payers.length === 1) payers = [{ ...payers[0], amount: '' }];
	}

	function fillPayerRow(id: string) {
		const sumOthers = payers
			.filter((p) => p.id !== id)
			.reduce((sum, p) => sum + (evalToCents(p.amount) ?? 0), 0);
		const target = amountCents - sumOthers;
		if (target < 0) return;
		setPayerRow(id, { amount: (target / 100).toFixed(2) });
	}

	function fillSplitRow(memberId: string) {
		const sumOthers = involvedList
			.filter((m) => m.id !== memberId)
			.reduce((sum, m) => sum + (evalToCents(amounts[m.id] ?? '') ?? 0), 0);
		const target = amountCents - sumOthers;
		if (target < 0) return;
		amounts = { ...amounts, [memberId]: (target / 100).toFixed(2) };
	}

	function autoFillRest() {
		if (splitMode !== 'amount') return;
		const empties = involvedList.filter((m) => (evalToCents(amounts[m.id] ?? '') ?? 0) === 0);
		if (empties.length === 0 || remaining <= 0) return;
		const portions = splitEvenly(remaining, empties.length);
		const next = { ...amounts };
		empties.forEach((m, i) => {
			next[m.id] = (portions[i] / 100).toFixed(2);
		});
		amounts = next;
	}

	function toggleMember(id: string) {
		const next = new Set(involved);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		involved = next;
	}

	function stepShare(id: string, delta: number) {
		shares = { ...shares, [id]: Math.max(0, (shares[id] ?? 0) + delta) };
	}

	function updateAmount(id: string, value: string) {
		amounts = { ...amounts, [id]: value };
	}

	function handleAddCategory(item: EmojiItem) {
		const cat: Category = { id: item.id, name: item.name, emoji: item.emoji };
		onAddCategory(cat);
		categoryId = cat.id;
	}

	function handleAddMethod(item: EmojiItem) {
		const m: PaymentMethodItem = { id: item.id, name: item.name, emoji: item.emoji };
		onAddPaymentMethod(m);
		paymentMethodId = m.id;
	}

	async function handleSubmit(event?: Event) {
		event?.preventDefault();
		if (submitting || !canSave) return;
		submitting = true;

		const finalPayments = isMultiPayer
			? payers.map((p, i) => ({ memberId: p.memberId, amount: payerCents[i] }))
			: [{ memberId: payers[0].memberId, amount: amountCents }];

		const expense: Expense = {
			id: seed?.id ?? generateId(),
			payments: finalPayments,
			amount: amountCents,
			currency: project.currency,
			description: title.trim(),
			categoryId,
			paymentMethodId,
			date: new Date(dateStr).getTime() || Date.now(),
			splitMode,
			splits: buildSplits(),
			notes: notes.trim() || undefined,
			createdAt: seed?.createdAt ?? Date.now(),
			createdBy: seed?.createdBy ?? currentMemberId ?? payers[0]?.memberId ?? ''
		};

		try {
			await onSave(expense);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{headerTitle} · Kostos</title>
</svelte:head>

<div class="screen" data-page="expense-form">
	<ScreenAppBar title={headerTitle} {onCancel}>
		{#snippet right()}
			<button
				type="button"
				class="btn btn-primary save-btn"
				disabled={!canSave || submitting}
				onclick={handleSubmit}
			>
				{saveLabel}
			</button>
		{/snippet}
	</ScreenAppBar>

	<form class="scroll" onsubmit={handleSubmit}>
		<AmountField
			bind:value={amountInput}
			cents={amountCents}
			symbol={currencySymbol}
			{currency}
			{isExpression}
		/>

		<input class="input title-input" bind:value={title} placeholder="What was it for?" />

		<div class="card field-card meta-card">
			<EmojiPickerField
				label="Category"
				fallbackEmoji="📦"
				items={project.categories}
				selectedId={categoryId}
				onSelect={(id) => (categoryId = id)}
				onAddCustom={handleAddCategory}
			/>
			<hr class="hairline" />
			<EmojiPickerField
				label="Payment method"
				fallbackEmoji="💳"
				items={project.paymentMethods}
				selectedId={paymentMethodId}
				onSelect={(id) => (paymentMethodId = id)}
				onAddCustom={handleAddMethod}
			/>
		</div>

		<PaidBySection
			{payers}
			{members}
			{amountCents}
			{paidTotal}
			{paidShort}
			symbol={currencySymbol}
			{currency}
			{currentMemberId}
			bind:dateStr
			onUpdatePayer={setPayerRow}
			onAddPayer={addPayer}
			onRemovePayer={removePayer}
			onFillPayer={fillPayerRow}
		/>

		<SplitSection
			{members}
			{amountCents}
			symbol={currencySymbol}
			{currency}
			{currentMemberId}
			{splitMode}
			{involved}
			{shares}
			{amounts}
			{memberShares}
			{remaining}
			{totalShares}
			{emptyInvolvedCount}
			{canAutoFill}
			onSetSplitMode={(m) => (splitMode = m)}
			onToggleMember={toggleMember}
			onStepShare={stepShare}
			onUpdateAmount={updateAmount}
			onAutoFillRest={autoFillRest}
			onFillSplitRow={fillSplitRow}
		/>

		<div class="card notes-card">
			<div class="row between notes-head">
				<div class="eyebrow">Note</div>
				<span class="dim mono note-count">{notes.length} / 280</span>
			</div>
			<textarea
				class="input notes-input"
				bind:value={notes}
				maxlength="280"
				placeholder="Optional context"
				rows="2"
			></textarea>
		</div>

		<button
			type="submit"
			class="btn btn-primary btn-block submit-btn"
			disabled={!canSave || submitting}
		>
			{submitting ? 'Saving…' : `${saveLabel} expense`}
		</button>
	</form>
</div>

<style>
	.save-btn {
		padding: 8px 14px;
		font-size: 13px;
	}

	.meta-card {
		padding: 4px;
		margin-bottom: 10px;
	}

	.title-input {
		margin: 18px 0 12px;
		text-align: left;
		font-size: 17px;
		font-weight: 600;
		padding: 16px;
	}

	.notes-card {
		margin-top: 10px;
	}

	.notes-head {
		margin-bottom: 8px;
	}

	.notes-input {
		padding: 12px;
		font-size: 13px;
		line-height: 1.45;
		resize: vertical;
		min-height: 60px;
		font-family: var(--font-sans);
	}

	.note-count {
		font-size: 11px;
	}

	.submit-btn {
		margin-top: 22px;
	}

	.submit-btn:disabled,
	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
