<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
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
			loaded = true;
		});
	});
</script>

{#if loaded}
	{@render children()}
{:else}
	<LoadingScreen />
{/if}
