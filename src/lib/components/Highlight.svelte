<script lang="ts">
	type Props = {
		text: string;
		query: string;
	};
	let { text, query }: Props = $props();

	const parts = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q || !text) return null;
		const lower = text.toLowerCase();
		const idx = lower.indexOf(q);
		if (idx === -1) return null;
		return {
			before: text.slice(0, idx),
			match: text.slice(idx, idx + q.length),
			after: text.slice(idx + q.length)
		};
	});
</script>

{#if parts}{parts.before}<mark class="hl">{parts.match}</mark>{parts.after}{:else}{text}{/if}

<style>
	.hl {
		background: transparent;
		color: inherit;
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
	}
</style>
