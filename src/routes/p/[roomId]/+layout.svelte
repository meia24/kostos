<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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
	<div class="screen loading-screen">
		<div class="loading-pulse" aria-hidden="true"></div>
	</div>
{/if}

<style>
	.loading-screen {
		justify-content: center;
		align-items: center;
	}

	.loading-pulse {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--accent) 30%, transparent);
		animation: pulse 1.4s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(0.85); opacity: 0.6; }
		50% { transform: scale(1); opacity: 1; }
	}
</style>
