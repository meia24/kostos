<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();
</script>

<div class="card empty-card">
	{@render children()}
</div>

<style>
	.empty-card {
		text-align: center;
		color: var(--ink-2);
		font-size: 13px;
		line-height: 1.5;
		padding: 24px 16px;
	}

	.empty-card :global(p) {
		margin: 0;
	}

	.empty-card :global(p + p),
	.empty-card :global(p + a),
	.empty-card :global(p + button) {
		margin-top: 14px;
	}
</style>
