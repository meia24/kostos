<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { expenseShares } from '$lib/balance';
	import { evalExpression, evalToCents, toMinorUnits } from '$lib/math';
	import { formatAmount } from '$lib/money';
	import { getCurrentMember } from '$lib/storage';
	import { addExpense, generateId, openRoom, readMembers, readProject } from '$lib/sync/doc';
	import type { Expense, ExpenseSplit, Member, Project, SplitMode } from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const handle = $derived(openRoom(roomId));

	let project = $state<Project | null>(null);
	let members = $state<Member[]>([]);

	$effect(() => {
		const h = handle;
		const sync = () => {
			project = readProject(h);
			members = readMembers(h);
			if (!payerId && members.length > 0) payerId = currentMemberId ?? members[0].id;
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

	const currentMemberId = $derived.by(() => getCurrentMember());

	let amountInput = $state('');
	let title = $state('');
	let dateStr = $state(new Date().toISOString().slice(0, 10));
	let payerId = $state('');
	let splitMode = $state<SplitMode>('even');
	let involved = $state<Set<string>>(new Set());
	let shares = $state<Record<string, number>>({});
	let amounts = $state<Record<string, string>>({});
	let notes = $state('');
	let payerOpen = $state(false);
	let submitting = $state(false);

	const amountCents = $derived(evalToCents(amountInput) ?? 0);
	const amountPreview = $derived.by(() => {
		const result = evalExpression(amountInput);
		if (result === null) return null;
		if (!/[+\-*/(),]/.test(amountInput.trim())) return null;
		return toMinorUnits(result);
	});
	const payerName = $derived(members.find((m) => m.id === payerId)?.name ?? 'You');
	const currencySymbol = $derived(project?.currencySymbol ?? '€');
	const involvedList = $derived(members.filter((m) => involved.has(m.id)));
	const canSave = $derived(
		amountCents > 0 && title.trim().length > 0 && payerId && involvedList.length > 0
	);

	function toggleMember(id: string) {
		const next = new Set(involved);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		involved = next;
	}

	function stepShare(id: string, delta: number) {
		const next = { ...shares };
		next[id] = Math.max(0, (next[id] ?? 0) + delta);
		shares = next;
	}

	const previewExpense: Expense | null = $derived.by(() => {
		if (!project || amountCents <= 0 || involvedList.length === 0) return null;
		return {
			id: 'preview',
			payerId: payerId || (members[0]?.id ?? ''),
			amount: amountCents,
			currency: project.currency,
			date: Date.now(),
			splitMode,
			splits: buildSplitsForPreview(),
			createdAt: Date.now(),
			createdBy: payerId || (members[0]?.id ?? '')
		};
	});

	function buildSplitsForPreview(): ExpenseSplit[] {
		if (splitMode === 'even') {
			return involvedList.map((m) => ({ memberId: m.id }));
		}
		if (splitMode === 'shares') {
			return involvedList.map((m) => ({ memberId: m.id, shares: shares[m.id] ?? 0 }));
		}
		return involvedList.map((m) => ({
			memberId: m.id,
			amount: evalToCents(amounts[m.id] ?? '') ?? 0
		}));
	}

	const memberShares = $derived(previewExpense ? expenseShares(previewExpense) : new Map<string, number>());
	const assignedAmount = $derived.by(() => {
		if (splitMode !== 'amount') return amountCents;
		return involvedList.reduce((sum, m) => sum + (evalToCents(amounts[m.id] ?? '') ?? 0), 0);
	});
	const remaining = $derived(amountCents - assignedAmount);
	const totalShares = $derived(involvedList.reduce((sum, m) => sum + (shares[m.id] ?? 0), 0));

	async function onSave(event?: Event) {
		event?.preventDefault();
		if (submitting || !canSave || !project) return;
		submitting = true;

		const expense: Expense = {
			id: generateId(),
			payerId,
			amount: amountCents,
			currency: project.currency,
			description: title.trim(),
			date: new Date(dateStr).getTime() || Date.now(),
			splitMode,
			splits: buildSplitsForPreview(),
			notes: notes.trim() || undefined,
			createdAt: Date.now(),
			createdBy: currentMemberId ?? payerId
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
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
		</div>
		<div class="app-bar-title">New expense</div>
		<div class="row gap-6" style="flex: 1; justify-content: flex-end;">
			<button
				type="button"
				class="btn btn-primary"
				style="padding: 8px 14px; font-size: 13px;"
				disabled={!canSave || submitting}
				onclick={onSave}
			>
				Save
			</button>
		</div>
	</header>

	<form class="scroll" onsubmit={onSave}>
		<div class="amount-block">
			<div class="eyebrow">Amount</div>
			<div class="amount-display">
				<span class="amount-symbol">{currencySymbol}</span>
				<span class="amount-value mono">{(amountCents / 100).toFixed(2)}</span>
			</div>
			<input
				class="input amount-input mono"
				bind:value={amountInput}
				placeholder="0.00 or 50/20-2"
				inputmode="decimal"
				autocomplete="off"
			/>
			{#if amountPreview !== null}
				<p class="dim amount-preview">= {formatAmount(amountPreview, currencySymbol)}</p>
			{/if}
		</div>

		<input class="input title-input" bind:value={title} placeholder="What was it for?" />

		<div class="card field-card">
			<button
				type="button"
				class="field field-button"
				aria-expanded={payerOpen}
				onclick={() => (payerOpen = !payerOpen)}
			>
				<span class="cat-tile field-tile">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 4v16M6 7h12M4 11l2-4 2 4a2 2 0 1 1-4 0zM16 11l2-4 2 4a2 2 0 1 1-4 0z" /></svg>
				</span>
				<span class="col field-text">
					<span class="field-label">Paid by</span>
					<span class="field-value-static">
						{payerId === currentMemberId ? `${payerName} (you)` : payerName}
					</span>
				</span>
				<span class="field-chevron" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 9l6 6 6-6" /></svg>
				</span>
			</button>
			{#if payerOpen}
				<ul class="payer-list">
					{#each members as m (m.id)}
						<li>
							<button
								type="button"
								class="payer-row"
								class:on={m.id === payerId}
								onclick={() => {
									payerId = m.id;
									payerOpen = false;
								}}
							>
								<span class="av av-sm payer-av">{(m.name[0] ?? '?').toUpperCase()}</span>
								<span class="col payer-text">
									<span class="payer-name">{m.name}{m.id === currentMemberId ? ' (you)' : ''}</span>
								</span>
								{#if m.id === payerId}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="payer-check"><path d="M5 12l5 5L20 7" /></svg>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			<hr class="hairline" />
			<div class="field">
				<span class="cat-tile field-tile">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
				</span>
				<span class="col field-text">
					<span class="field-label">Date</span>
					<input class="date-input" type="date" bind:value={dateStr} />
				</span>
			</div>
		</div>

		<div class="card split-card">
			<div class="row between" style="margin-bottom: 12px;">
				<div class="eyebrow">Split</div>
				<div class="dim mono split-summary">
					{involvedList.length} OF {members.length} INVOLVED
				</div>
			</div>

			<div class="row gap-6 split-tabs">
				<button
					type="button"
					class="split-tab"
					class:on={splitMode === 'even'}
					onclick={() => (splitMode = 'even')}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 4v16M6 7h12M4 11l2-4 2 4a2 2 0 1 1-4 0zM16 11l2-4 2 4a2 2 0 1 1-4 0z" /></svg>
					<span class="split-tab-label">Evenly</span>
					<span class="split-tab-sub">
						{involvedList.length > 0
							? `${formatAmount(Math.trunc(amountCents / involvedList.length), currencySymbol)} each`
							: '—'}
					</span>
				</button>
				<button
					type="button"
					class="split-tab"
					class:on={splitMode === 'shares'}
					onclick={() => (splitMode = 'shares')}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 18L18 6" /><circle cx="7.5" cy="7.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /></svg>
					<span class="split-tab-label">Shares</span>
					<span class="split-tab-sub">by weights</span>
				</button>
				<button
					type="button"
					class="split-tab"
					class:on={splitMode === 'amount'}
					onclick={() => (splitMode = 'amount')}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="10" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
					<span class="split-tab-label">Amounts</span>
					<span class="split-tab-sub">precise</span>
				</button>
			</div>

			<div class="col gap-8 member-list">
				{#each members as m (m.id)}
					{@const isIn = involved.has(m.id)}
					{@const portion = memberShares.get(m.id) ?? 0}
					<div class="member-row" class:dim={!isIn}>
						<button
							type="button"
							class="checkbox"
							class:on={isIn}
							aria-checked={isIn}
							role="checkbox"
							aria-label={isIn ? `Remove ${m.name}` : `Include ${m.name}`}
							onclick={() => toggleMember(m.id)}
						>
							{#if isIn}
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7" /></svg>
							{/if}
						</button>
						<span class="av av-sm member-av">{(m.name[0] ?? '?').toUpperCase()}</span>
						<span class="member-name">{m.name}{m.id === currentMemberId ? ' (you)' : ''}</span>
						{#if !isIn}
							<span class="dim mono dash">—</span>
						{:else if splitMode === 'even'}
							<span class="num member-amount">{formatAmount(portion, currencySymbol)}</span>
						{:else if splitMode === 'shares'}
							<div class="row gap-6 shares-controls">
								<button type="button" class="step-btn" onclick={() => stepShare(m.id, -1)} aria-label="Decrease shares">−</button>
								<span class="num share-value">{shares[m.id] ?? 0}</span>
								<button type="button" class="step-btn" onclick={() => stepShare(m.id, 1)} aria-label="Increase shares">+</button>
							</div>
							<span class="num member-amount">{formatAmount(portion, currencySymbol)}</span>
						{:else}
							<input
								class="input amount-input-sm mono"
								bind:value={amounts[m.id]}
								placeholder="0.00"
								inputmode="decimal"
								autocomplete="off"
							/>
						{/if}
					</div>
				{/each}
			</div>

			<hr class="hairline" style="margin: 14px 0 12px;" />
			<div class="row between sanity">
				<div class="row gap-6">
					<span class="dim mono">SUM</span>
					<span class="num sanity-value">{formatAmount(amountCents, currencySymbol)}</span>
				</div>
				{#if splitMode === 'amount'}
					<div class="row gap-6">
						<span class="dim mono">REMAINING</span>
						<span
							class="num sanity-value"
							class:tone-owed={remaining === 0}
							class:tone-owe={remaining !== 0}
						>{formatAmount(remaining, currencySymbol)}</span>
					</div>
				{:else if splitMode === 'shares'}
					<div class="row gap-6">
						<span class="dim mono">SHARES</span>
						<span class="num sanity-value">{totalShares}</span>
					</div>
				{:else if involvedList.length > 0}
					<div class="row gap-6">
						<span class="dim mono">PER PERSON</span>
						<span class="num sanity-value">
							{formatAmount(Math.trunc(amountCents / involvedList.length), currencySymbol)}
						</span>
					</div>
				{/if}
			</div>
		</div>

		<div class="card notes-card">
			<div class="row between" style="margin-bottom: 8px;">
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
	.amount-block {
		text-align: center;
		padding: 18px 0 6px;
	}

	.amount-display {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		margin-top: 8px;
	}

	.amount-symbol {
		font-family: var(--font-display);
		font-size: 32px;
		color: var(--ink-2);
	}

	.amount-value {
		font-family: var(--font-display);
		font-size: 64px;
		line-height: 1;
		letter-spacing: -0.02em;
		color: var(--accent);
	}

	.amount-input {
		margin: 14px auto 0;
		max-width: 260px;
		text-align: center;
		letter-spacing: 0.04em;
	}

	.amount-preview {
		font-size: 11px;
		font-family: var(--font-mono);
		margin: 8px 0 0;
	}

	.title-input {
		margin: 18px 0 12px;
		text-align: left;
		font-size: 17px;
		font-weight: 600;
		padding: 16px;
	}

	.field-card {
		padding: 4px;
		margin-bottom: 10px;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 12px;
	}

	.field-button {
		width: 100%;
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.field-text {
		flex: 1;
		align-items: flex-start;
	}

	.field-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.field-value-static {
		font-size: 14px;
		color: var(--ink);
		padding-top: 4px;
	}

	.field-tile svg {
		width: 18px;
		height: 18px;
	}

	.field-chevron svg {
		width: 18px;
		height: 18px;
	}

	.field-chevron {
		color: var(--ink-3);
	}

	.payer-list {
		list-style: none;
		margin: 0;
		padding: 4px 8px 8px;
		border-top: 1px solid var(--line);
	}

	.payer-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 4px;
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
	}

	.payer-av {
		background: color-mix(in oklab, var(--ink) 12%, transparent);
		color: var(--ink);
	}

	.payer-text {
		flex: 1;
	}

	.payer-name {
		font-size: 13px;
		font-weight: 500;
	}

	.payer-check {
		width: 18px;
		height: 18px;
		color: var(--accent);
	}

	.payer-row.on .payer-name {
		color: var(--accent);
	}

	.date-input {
		background: transparent;
		border: 0;
		padding: 4px 0 0;
		font-size: 14px;
		color: var(--ink);
		outline: none;
		font-family: var(--font-sans);
	}

	.split-card {
		padding: 16px;
	}

	.split-summary {
		font-size: 11px;
	}

	.split-tabs {
		margin-bottom: 14px;
	}

	.split-tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 10px 6px;
		border-radius: 14px;
		background: var(--bg);
		color: var(--ink-2);
		border: 1px solid var(--line);
		cursor: pointer;
		font-family: inherit;
	}

	.split-tab.on {
		background: var(--accent);
		color: var(--accent-ink);
		border-color: var(--accent);
	}

	.split-tab svg {
		width: 18px;
		height: 18px;
	}

	.split-tab-label {
		font-size: 12px;
		font-weight: 600;
	}

	.split-tab-sub {
		font-size: 10px;
		font-family: var(--font-mono);
		opacity: 0.75;
	}

	.member-list {
		gap: 12px;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.checkbox {
		width: 20px;
		height: 20px;
		border-radius: 6px;
		border: 1.5px solid var(--line-2);
		background: transparent;
		color: var(--accent-ink);
		display: grid;
		place-items: center;
		flex-shrink: 0;
		cursor: pointer;
		padding: 0;
	}

	.checkbox.on {
		background: var(--accent);
		border-color: var(--accent);
	}

	.member-av {
		background: color-mix(in oklab, var(--ink) 12%, transparent);
		color: var(--ink);
	}

	.member-name {
		flex: 1;
		font-size: 13px;
		font-weight: 500;
	}

	.dim .member-name {
		color: var(--ink-3);
	}

	.member-amount {
		min-width: 64px;
		text-align: right;
		font-weight: 600;
		font-size: 13px;
	}

	.dash {
		font-size: 11px;
	}

	.shares-controls {
		align-items: center;
	}

	.step-btn {
		width: 28px;
		height: 28px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--bg-2);
		color: var(--ink);
		cursor: pointer;
		font-size: 14px;
		font-weight: 700;
	}

	.share-value {
		min-width: 22px;
		text-align: center;
		font-weight: 700;
	}

	.amount-input-sm {
		width: 96px;
		padding: 8px 10px;
		font-size: 13px;
		text-align: right;
	}

	.sanity {
		font-size: 12px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.sanity-value {
		font-weight: 600;
	}

	.notes-card {
		margin-top: 10px;
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

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
