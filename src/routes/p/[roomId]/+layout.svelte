<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import { updateProjectMetadata } from '$lib/storage';
	import { openRoom, readProject } from '$lib/sync/doc';

	let { children } = $props();

	const roomId = $derived(page.params.roomId ?? '');
	let loaded = $state(false);

	$effect(() => {
		if (!roomId) return;
		const handle = openRoom(roomId);
		handle.ready.then(() => {
			const project = readProject(handle);
			if (!project) {
				goto('/', { replaceState: true });
				return;
			}
			// Refresh the cached projects-list entry every time we enter the room so the
			// landing page shows current name/emoji/color and bumps the "most recent" sort.
			updateProjectMetadata(roomId, {
				name: project.name,
				emoji: project.emoji,
				color: project.color,
				lastActiveAt: Date.now()
			});
			loaded = true;
		});
	});
</script>

{#if loaded}
	{@render children()}
{:else}
	<LoadingScreen />
{/if}
