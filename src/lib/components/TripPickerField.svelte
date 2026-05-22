<script lang="ts">
	import TripSheet from './TripSheet.svelte';
	import { partitionTrips } from '$lib/trips';
	import type { Trip } from '$lib/types';

	type Props = {
		trips: Trip[];
		selectedId: string | undefined;
		onSelect: (id: string | undefined) => void;
		manageHref: string;
	};

	let { trips, selectedId, onSelect, manageHref }: Props = $props();

	let open = $state(false);
	let sheetOpen = $state(false);

	const partition = $derived(partitionTrips(trips));
	// The selected trip may be a past one (e.g. backdated expense or edit of a stale tag),
	// so look it up across the whole list, not just active.
	const selected = $derived(trips.find((t) => t.id === selectedId));
	const displayEmoji = $derived(selected?.emoji ?? '🗺️');
	const displayName = $derived(selected?.name ?? 'None');
	const showSheetEntry = $derived(partition.past.length > 0);

	function pick(id: string | undefined) {
		onSelect(id);
		open = false;
	}

	function pickFromSheet(id: string | null) {
		onSelect(id ?? undefined);
		sheetOpen = false;
		open = false;
	}
</script>

<div class="picker-field">
	<button
		type="button"
		class="picker-row"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<span class="picker-tile" class:dim-tile={!selected}>{displayEmoji}</span>
		<span class="col picker-text">
			<span class="picker-label">Trip</span>
			<span class="picker-value" class:is-empty={!selected}>{displayName}</span>
		</span>
		<span class="picker-chevron" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</span>
	</button>
	{#if open}
		<ul class="picker-list">
			<li>
				<button
					type="button"
					class="picker-option"
					class:on={selectedId === undefined}
					onclick={() => pick(undefined)}
				>
					<span class="picker-option-emoji dim-tile">—</span>
					<span class="picker-option-name">None</span>
				</button>
			</li>
			{#each partition.active as t (t.id)}
				<li>
					<button
						type="button"
						class="picker-option"
						class:on={t.id === selectedId}
						onclick={() => pick(t.id)}
					>
						<span class="picker-option-emoji">{t.emoji}</span>
						<span class="picker-option-name">{t.name}</span>
					</button>
				</li>
			{/each}
			{#if selected && !partition.active.some((t) => t.id === selected.id)}
				<li>
					<button
						type="button"
						class="picker-option on"
						onclick={() => pick(selected.id)}
					>
						<span class="picker-option-emoji">{selected.emoji}</span>
						<span class="picker-option-name">{selected.name} <span class="dim">· past</span></span>
					</button>
				</li>
			{/if}
			{#if showSheetEntry}
				<li>
					<button
						type="button"
						class="picker-option manage-link"
						onclick={() => {
							open = false;
							sheetOpen = true;
						}}
					>
						<span class="picker-option-emoji dim-tile">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
								<path d="M5 12h14M13 6l6 6-6 6" />
							</svg>
						</span>
						<span class="picker-option-name">View all trips</span>
					</button>
				</li>
			{/if}
		</ul>
	{/if}
</div>

<TripSheet
	open={sheetOpen}
	{trips}
	showAllRow={false}
	selectedTripId={selectedId ?? null}
	{manageHref}
	onSelect={pickFromSheet}
	onClose={() => (sheetOpen = false)}
/>

<style>
	.picker-field {
		display: flex;
		flex-direction: column;
	}

	.picker-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 12px;
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	.picker-tile {
		width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		flex-shrink: 0;
	}

	.dim-tile {
		opacity: 0.4;
	}

	.picker-text {
		flex: 1;
		gap: 2px;
	}

	.picker-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.picker-value {
		font-size: 14px;
		color: var(--ink);
	}

	.picker-value.is-empty {
		color: var(--ink-3);
	}

	.picker-chevron {
		color: var(--ink-3);
	}

	.picker-chevron svg {
		width: 18px;
		height: 18px;
	}

	.picker-list {
		list-style: none;
		margin: 0;
		padding: 4px 8px 8px;
		border-top: 1px solid var(--line);
	}

	.picker-option {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 4px;
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
		text-align: left;
		font: inherit;
		text-decoration: none;
	}

	.picker-option-emoji {
		width: 24px;
		text-align: center;
		font-size: 16px;
	}

	.picker-option-emoji svg {
		width: 14px;
		height: 14px;
	}

	.picker-option-name {
		flex: 1;
		font-size: 13px;
		font-weight: 500;
	}

	.picker-option.on .picker-option-name {
		color: var(--accent);
	}

	.manage-link {
		border-top: 1px dashed var(--line);
		margin-top: 4px;
		padding-top: 10px;
		color: var(--accent);
	}
</style>
