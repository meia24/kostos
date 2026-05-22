<script lang="ts">
	import { partitionTrips } from '$lib/trips';
	import type { Trip } from '$lib/types';

	type Props = {
		open: boolean;
		trips: Trip[];
		selectedTripId: string | null;
		showAllRow?: boolean;
		manageHref: string;
		onSelect: (tripId: string | null) => void;
		onClose: () => void;
	};

	let {
		open,
		trips,
		selectedTripId,
		showAllRow = true,
		manageHref,
		onSelect,
		onClose
	}: Props = $props();

	let query = $state('');
	$effect(() => {
		// Reset the search field whenever the sheet is reopened.
		if (open) query = '';
	});

	const partition = $derived(partitionTrips(trips));
	const showSearch = $derived(trips.length > 10);

	const filteredActive = $derived(filterTrips(partition.active, query));
	const filteredPast = $derived(filterTrips(partition.past, query));

	function filterTrips(list: Trip[], q: string): Trip[] {
		const trimmed = q.trim().toLowerCase();
		if (!trimmed) return list;
		return list.filter((t) => t.name.toLowerCase().includes(trimmed));
	}

	function onBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
	}

	function formatRange(t: Trip): string {
		const start = isoDate(t.startDate);
		if (t.endDate === undefined) return `${start} → ongoing`;
		const end = isoDate(t.endDate);
		return start === end ? start : `${start} → ${end}`;
	}

	function isoDate(ms: number): string {
		return new Date(ms).toISOString().slice(0, 10);
	}
</script>

{#if open}
	<div
		class="sheet-backdrop"
		role="button"
		tabindex="-1"
		aria-label="Close trip picker"
		onclick={onClose}
		onkeydown={onBackdropKeydown}
	></div>
	<div class="sheet" role="dialog" aria-modal="true" aria-label="Pick a trip">
		<div class="grabber" aria-hidden="true"></div>
		<div class="sheet-head">
			<span class="sheet-title">Pick a trip</span>
			<button type="button" class="icon-btn sheet-close" onclick={onClose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
		</div>

		{#if showSearch}
			<input
				class="input sheet-search"
				type="search"
				bind:value={query}
				placeholder="Search trips"
				aria-label="Search trips"
			/>
		{/if}

		<div class="sheet-scroll">
			{#if showAllRow}
				<button
					type="button"
					class="sheet-row"
					class:on={selectedTripId === null}
					onclick={() => onSelect(null)}
				>
					<span class="row-icon">🗂️</span>
					<span class="row-text">
						<span class="row-title">All expenses</span>
						<span class="row-sub">No trip scope</span>
					</span>
					{#if selectedTripId === null}<span class="row-check">✓</span>{/if}
				</button>
			{/if}

			{#if filteredActive.length > 0}
				<div class="section-label">Active</div>
				{#each filteredActive as t (t.id)}
					<button
						type="button"
						class="sheet-row"
						class:on={selectedTripId === t.id}
						onclick={() => onSelect(t.id)}
					>
						<span class="row-icon">{t.emoji}</span>
						<span class="row-text">
							<span class="row-title">{t.name}</span>
							<span class="row-sub">{formatRange(t)}</span>
						</span>
						{#if selectedTripId === t.id}<span class="row-check">✓</span>{/if}
					</button>
				{/each}
			{/if}

			{#if filteredPast.length > 0}
				<div class="section-label">Past</div>
				{#each filteredPast as t (t.id)}
					<button
						type="button"
						class="sheet-row past"
						class:on={selectedTripId === t.id}
						onclick={() => onSelect(t.id)}
					>
						<span class="row-icon">{t.emoji}</span>
						<span class="row-text">
							<span class="row-title">{t.name}</span>
							<span class="row-sub">{formatRange(t)}</span>
						</span>
						{#if selectedTripId === t.id}<span class="row-check">✓</span>{/if}
					</button>
				{/each}
			{/if}

			{#if filteredActive.length === 0 && filteredPast.length === 0}
				<p class="empty-text">
					{query.trim() ? 'No trips match your search.' : 'No trips yet.'}
				</p>
			{/if}
		</div>

		<a class="sheet-cta" href={manageHref} onclick={onClose}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<path d="M12 5v14M5 12h14" />
			</svg>
			<span>New trip</span>
		</a>
	</div>
{/if}

<style>
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background: color-mix(in oklab, black 55%, transparent);
		z-index: 1100;
		border: 0;
		cursor: pointer;
		animation: fade-in 0.12s ease-out;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		margin-inline: auto;
		width: 100%;
		max-width: 480px;
		max-height: 78vh;
		background: var(--bg-2);
		border-top-left-radius: 20px;
		border-top-right-radius: 20px;
		border: 1px solid var(--line);
		border-bottom: 0;
		padding: 6px 14px calc(16px + env(safe-area-inset-bottom, 0px));
		z-index: 1101;
		display: flex;
		flex-direction: column;
		box-shadow: 0 -10px 30px color-mix(in oklab, black 35%, transparent);
		animation: slide-up 0.18s ease-out;
	}

	.grabber {
		width: 36px;
		height: 4px;
		border-radius: 999px;
		background: var(--line-2);
		margin: 6px auto 8px;
	}

	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2px 8px;
	}

	.sheet-title {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.sheet-close {
		width: 28px;
		height: 28px;
	}

	.sheet-close svg {
		width: 14px;
		height: 14px;
	}

	.sheet-search {
		margin: 4px 0 10px;
		padding: 10px 12px;
		font-size: 14px;
	}

	.sheet-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 4px 0 8px;
	}

	.section-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-3);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 10px 4px 4px;
	}

	.sheet-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 6px;
		background: transparent;
		border: 0;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		border-radius: 10px;
	}

	.sheet-row:hover {
		background: color-mix(in oklab, var(--ink) 6%, transparent);
	}

	.sheet-row.on {
		background: color-mix(in oklab, var(--accent) 16%, transparent);
	}

	.row-icon {
		font-size: 22px;
		width: 28px;
		text-align: center;
	}

	.sheet-row.past .row-icon {
		opacity: 0.7;
	}

	.row-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.row-title {
		font-size: 14px;
		font-weight: 600;
	}

	.row-sub {
		font-size: 11px;
		font-family: var(--font-mono);
		color: var(--ink-3);
	}

	.row-check {
		color: var(--accent);
		font-size: 16px;
		font-weight: 700;
		padding-right: 4px;
	}

	.empty-text {
		text-align: center;
		font-size: 13px;
		color: var(--ink-3);
		margin: 20px 0;
	}

	.sheet-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 12px;
		margin-top: 8px;
		border-top: 1px solid var(--line);
		text-decoration: none;
		color: var(--accent);
		font-size: 13px;
		font-weight: 600;
	}

	.sheet-cta svg {
		width: 14px;
		height: 14px;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slide-up {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
</style>
