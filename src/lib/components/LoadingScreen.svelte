<script lang="ts">
	type Props = {
		label?: string;
		hint?: string;
	};

	let { label, hint }: Props = $props();
</script>

<div class="screen loading-screen">
	<div class="loading-pulse" aria-hidden="true"></div>
	{#if label}<p class="dim mono loading-label">{label}</p>{/if}
	{#if hint}<p class="dim loading-hint">{hint}</p>{/if}
</div>

<style>
	.loading-screen {
		justify-content: center;
		align-items: center;
		text-align: center;
		gap: 14px;
		padding: 24px;
	}

	.loading-pulse {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--accent) 30%, transparent);
		animation: pulse 1.4s ease-in-out infinite;
	}

	.loading-label {
		font-size: 12px;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.loading-hint {
		font-size: 12px;
		max-width: 280px;
		line-height: 1.5;
		margin: 0;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(0.85); opacity: 0.6; }
		50% { transform: scale(1); opacity: 1; }
	}
</style>
