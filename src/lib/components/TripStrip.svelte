<script lang="ts">
	import type { Trip } from '$lib/types';

	type Props = {
		trips: Trip[];
		selectedTripId: string | null;
		expenseCountAll: number;
		expenseCountForTrip: (tripId: string) => number;
		onSelect: (tripId: string | null) => void;
		manageHref: string;
	};

	let {
		trips,
		selectedTripId,
		expenseCountAll,
		expenseCountForTrip,
		onSelect,
		manageHref
	}: Props = $props();

	const activeTrips = $derived(trips.filter((t) => t.closedAt === undefined));
</script>

{#if activeTrips.length > 0}
	<div class="trip-strip" role="tablist" aria-label="Trips">
		<button
			type="button"
			class="trip-chip"
			class:on={selectedTripId === null}
			role="tab"
			aria-selected={selectedTripId === null}
			onclick={() => onSelect(null)}
		>
			<span class="chip-label">All</span>
			<span class="chip-count mono">{expenseCountAll}</span>
		</button>
		{#each activeTrips as t (t.id)}
			<button
				type="button"
				class="trip-chip"
				class:on={selectedTripId === t.id}
				role="tab"
				aria-selected={selectedTripId === t.id}
				onclick={() => onSelect(t.id)}
			>
				<span class="chip-emoji">{t.emoji}</span>
				<span class="chip-label">{t.name}</span>
				<span class="chip-count mono">{expenseCountForTrip(t.id)}</span>
			</button>
		{/each}
		<a class="trip-chip add-chip" href={manageHref} aria-label="Manage trips">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<path d="M12 5v14M5 12h14" />
			</svg>
		</a>
	</div>
{/if}

<style>
	.trip-strip {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		padding: 4px 0 10px;
		margin: 0 -16px;
		padding-left: 16px;
		padding-right: 16px;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.trip-strip::-webkit-scrollbar {
		display: none;
	}

	.trip-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		background: var(--bg-2);
		border: 1px solid var(--line);
		border-radius: 999px;
		color: var(--ink-2);
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		flex-shrink: 0;
		text-decoration: none;
		transition: border-color 0.12s ease, color 0.12s ease, background 0.12s ease;
	}

	.trip-chip.on {
		background: color-mix(in oklab, var(--accent) 16%, var(--bg-2));
		border-color: var(--accent);
		color: var(--ink);
	}

	.chip-emoji {
		font-size: 14px;
		line-height: 1;
	}

	.chip-label {
		white-space: nowrap;
	}

	.chip-count {
		font-size: 10px;
		opacity: 0.6;
		padding: 1px 5px;
		background: color-mix(in oklab, var(--ink) 8%, transparent);
		border-radius: 999px;
	}

	.trip-chip.on .chip-count {
		opacity: 0.85;
	}

	.add-chip {
		padding: 6px 10px;
		color: var(--ink-3);
	}

	.add-chip svg {
		width: 14px;
		height: 14px;
	}

	.add-chip:hover {
		color: var(--accent);
		border-color: color-mix(in oklab, var(--accent) 40%, var(--line));
	}
</style>
