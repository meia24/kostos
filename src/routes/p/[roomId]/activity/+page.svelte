<script lang="ts">
	import { page } from '$app/state';
	import ActivityList from '$lib/components/ActivityList.svelte';
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
			<ActivityList {events} {membersById} {currentMemberId} />
		{/if}
	</div>
</div>
