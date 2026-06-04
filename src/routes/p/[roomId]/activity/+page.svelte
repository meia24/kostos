<script lang="ts">
	import { page } from '$app/state';
	import ActivityRow from '$lib/components/ActivityRow.svelte';
	import EmptyCard from '$lib/components/EmptyCard.svelte';
	import ScreenAppBar from '$lib/components/ScreenAppBar.svelte';
	import { getCurrentMember } from '$lib/storage';
	import { useRoom } from '$lib/sync/useRoom.svelte';

	const roomId = $derived(page.params.roomId ?? '');
	const room = $derived(useRoom(roomId));
	$effect(() => room.observe());

	const currentMemberId = $derived.by(() => getCurrentMember(roomId));
	const membersById = $derived(room.membersById);
	const events = $derived([...room.activity].reverse());
</script>

<div class="screen" data-page="activity">
	<ScreenAppBar title="Activity" backHref="/p/{roomId}" />
	<div class="scroll">
		{#if events.length === 0}
			<EmptyCard>
				<p>No activity yet. Adding, editing, or settling expenses shows up here.</p>
			</EmptyCard>
		{:else}
			<div class="card activity-card">
				{#each events as ev, i (ev.id)}
					{#if i > 0}<hr class="hairline" style="margin-left: 32px;" />{/if}
					<ActivityRow event={ev} {membersById} {currentMemberId} />
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.activity-card {
		padding: 4px;
	}
</style>
