<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AmountField from '$lib/components/AmountField.svelte';
	import EmojiPickerField from '$lib/components/EmojiPickerField.svelte';
	import type { EmojiItem } from '$lib/components/EmojiPickerField.svelte';
	import PaidBySection from '$lib/components/PaidBySection.svelte';
	import type { PaymentRow } from '$lib/components/PaidBySection.svelte';
	import SplitSection from '$lib/components/SplitSection.svelte';
	import { expenseShares, splitEvenly } from '$lib/balance';
	import { evalToCents } from '$lib/math';
	import { getCurrentMember } from '$lib/storage';
	import {
		addCategory,
		addExpense,
		addPaymentMethod,
		generateId,
		openRoom,
		readMembers,
		readProject
	} from '$lib/sync/doc';
	import type {
		Category,
		Expense,
		ExpenseSplit,
		Member,
		PaymentMethodItem,
		Project,
		SplitMode
	} from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const handle = $derived(openRoom(roomId));

	let project = $state<Project | null>(null);
	let members = $state<Member[]>([]);

	const currentMemberId = $derived.by(() => getCurrentMember());

	let amountInput = $state('');
	let amountCents = $state(0);
	let title = $state('');
	let dateStr = $state(new Date().toISOString().slice(0, 10));
	let payers = $state<PaymentRow[]>([]);
	let splitMode = $state<SplitMode>('even');
	let involved = $state<Set<string>>(new Set());
	let shares = $state<Record<string, number>>({});
	let amounts = $state<Record<string, string>>({});
	let notes = $state('');
	let categoryId = $state<string | undefined>(undefined);
	let paymentMethodId = $state<string | undefined>(undefined);
	let submitting = $state(false);

	$effect(() => {
		const h = handle;
		const sync = () => {
			project = readProject(h);
			members = readMembers(h);
			if (payers.length === 0 && members.length > 0) {
				payers = [
					{ id: generateId(), memberId: currentMemberId ?? members[0].id, amount: '' }
				];
			}
			if (involved.size === 0 && members.length > 0) {
				involved = new Set(members.map((m) => m.id));
				for (const m of members) {
					shares[m.id] = 1;
					amounts[m.id] = '';
				}
			}
		};
		sync();
		h.project.observeDeep(sync);
		h.members.observeDeep(sync);
		return () => {
			h.project.unobserveDeep(sync);
			h.members.unobserveDeep(sync);
		};
	});

	// Hold the last valid evaluation while the user is still typing an incomplete
	// expression like `50/`. Empty input resets to zero.
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
	const currencySymbol = $derived(project?.currencySymbol ?? '€');
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
		if (!project || amountCents <= 0 || involvedList.length === 0) return null;
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
		return involvedList.reduce(
			(sum, m) => sum + (evalToCents(amounts[m.id] ?? '') ?? 0),
			0
		);
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

	function nextAvailableMember(): string {
		const taken = new Set(payers.map((p) => p.memberId));
		const free = members.find((m) => !taken.has(m.id));
		return free?.id ?? members[0]?.id ?? '';
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

	function onAddCategory(item: EmojiItem) {
		const cat: Category = { id: item.id, name: item.name, emoji: item.emoji };
		addCategory(handle, cat);
		categoryId = cat.id;
	}

	function onAddMethod(item: EmojiItem) {
		const m: PaymentMethodItem = { id: item.id, name: item.name, emoji: item.emoji };
		addPaymentMethod(handle, m);
		paymentMethodId = m.id;
	}

	async function onSave(event?: Event) {
		event?.preventDefault();
		if (submitting || !canSave || !project) return;
		submitting = true;

		const finalPayments = isMultiPayer
			? payers.map((p, i) => ({ memberId: p.memberId, amount: payerCents[i] }))
			: [{ memberId: payers[0].memberId, amount: amountCents }];

		const expense: Expense = {
			id: generateId(),
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
			createdAt: Date.now(),
			createdBy: currentMemberId ?? payers[0]?.memberId ?? ''
		};

		addExpense(handle, expense);
		await goto(`/p/${roomId}`);
	}

	function onCancel() {
		goto(`/p/${roomId}`);
	}
</script>

<svelte:head>
	<title>New expense · Kostos</title>
</svelte:head>

<div class="screen" data-page="add-expense">
	<header class="app-bar">
		<div class="row gap-8" style="flex: 1;">
			<button class="icon-btn" aria-label="Cancel" onclick={onCancel}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
			</button>
		</div>
		<div class="app-bar-title">New expense</div>
		<div class="row gap-6" style="flex: 1; justify-content: flex-end;">
			<button
				type="button"
				class="btn btn-primary save-btn"
				disabled={!canSave || submitting}
				onclick={onSave}
			>
				Save
			</button>
		</div>
	</header>

	<form class="scroll" onsubmit={onSave}>
		<AmountField
			bind:value={amountInput}
			cents={amountCents}
			symbol={currencySymbol}
			{isExpression}
		/>

		<input class="input title-input" bind:value={title} placeholder="What was it for?" />

		<div class="card field-card meta-card">
			<EmojiPickerField
				label="Category"
				fallbackEmoji="📦"
				items={project?.categories ?? []}
				selectedId={categoryId}
				onSelect={(id) => (categoryId = id)}
				onAddCustom={onAddCategory}
			/>
			<hr class="hairline" />
			<EmojiPickerField
				label="Payment method"
				fallbackEmoji="💳"
				items={project?.paymentMethods ?? []}
				selectedId={paymentMethodId}
				onSelect={(id) => (paymentMethodId = id)}
				onAddCustom={onAddMethod}
			/>
		</div>

		<PaidBySection
			{payers}
			{members}
			{amountCents}
			{paidTotal}
			{paidShort}
			symbol={currencySymbol}
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
			{submitting ? 'Saving…' : 'Save expense'}
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
