<script lang="ts">
	import QRCode from 'qrcode';

	type Props = {
		value: string;
		size?: number;
		margin?: number;
	};

	let { value, size = 220, margin = 1 }: Props = $props();

	let svg = $state<string>('');

	$effect(() => {
		if (!value) {
			svg = '';
			return;
		}
		let cancelled = false;
		QRCode.toString(value, {
			type: 'svg',
			errorCorrectionLevel: 'M',
			margin,
			color: { dark: '#000000', light: '#00000000' }
		})
			.then((out) => {
				if (!cancelled) svg = out;
			})
			.catch((err) => {
				console.warn('[qr] generation failed:', err);
				if (!cancelled) svg = '';
			});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if svg}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<div class="qr" style="width: {size}px; height: {size}px;" aria-label="QR code">{@html svg}</div>
{:else}
	<div class="qr placeholder" style="width: {size}px; height: {size}px;" aria-hidden="true"></div>
{/if}

<style>
	.qr {
		background: var(--surface, #fff);
		border-radius: 14px;
		padding: 12px;
		display: grid;
		place-items: center;
		box-sizing: border-box;
	}

	.qr :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
		color: var(--ink);
	}

	.qr :global(svg path) {
		fill: var(--ink);
	}

	.placeholder {
		background: color-mix(in oklab, var(--ink) 6%, transparent);
		border-radius: 14px;
	}
</style>
