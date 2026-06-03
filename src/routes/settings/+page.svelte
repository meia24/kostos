<script lang="ts">
	import { version } from '$app/environment';
	import AppearanceControls from '$lib/components/AppearanceControls.svelte';
	import ScreenAppBar from '$lib/components/ScreenAppBar.svelte';
</script>

<svelte:head>
	<title>Settings · Kostos</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="screen" data-page="settings">
	<ScreenAppBar title="Settings" backHref="/" />
	<div class="scroll settings-scroll">
		<AppearanceControls />
		<p class="version">Kostos v{version}</p>
	</div>
</div>

<style>
	.settings-scroll {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.version {
		text-align: center;
		color: var(--ink-3);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		margin: 4px 0 0;
	}
</style>
