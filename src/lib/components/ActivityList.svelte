<script lang="ts">
	import type { ActivityEvent, Member } from '$lib/types';
	import ActivityRow from './ActivityRow.svelte';

	type Props = {
		events: ActivityEvent[];
		membersById: Map<string, Member>;
		currentMemberId: string | null;
		roomId?: string;
	};

	let { events, membersById, currentMemberId, roomId }: Props = $props();
</script>

<div class="activity-list">
	{#each events as ev, i (ev.id)}
		{#if i > 0}<hr class="hairline" />{/if}
		<ActivityRow event={ev} {membersById} {currentMemberId} {roomId} />
	{/each}
</div>

<style>
	.activity-list {
		display: flex;
		flex-direction: column;
	}
</style>
