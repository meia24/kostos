<script lang="ts">
	export type DonutSlice = {
		key: string;
		value: number;
		color: string;
	};

	type Props = {
		slices: DonutSlice[];
		centerLabel?: string;
		centerValue?: string;
		size?: number;
	};

	let { slices, centerLabel, centerValue, size = 132 }: Props = $props();

	const R_OUT = 44;
	const R_IN = 30;
	const STROKE = R_OUT - R_IN;
	const CX = 50;
	const CY = 50;
	const RADIUS = (R_OUT + R_IN) / 2;

	const total = $derived(slices.reduce((s, c) => s + c.value, 0));

	const arcs = $derived.by(() => {
		if (total <= 0) return [];
		let cumulative = 0;
		return slices.map((slice) => {
			const startPct = cumulative / total;
			cumulative += slice.value;
			const endPct = cumulative / total;
			const a0 = startPct * 2 * Math.PI - Math.PI / 2;
			const a1 = endPct * 2 * Math.PI - Math.PI / 2;
			const large = endPct - startPct > 0.5 ? 1 : 0;
			const x0 = CX + RADIUS * Math.cos(a0);
			const y0 = CY + RADIUS * Math.sin(a0);
			const x1 = CX + RADIUS * Math.cos(a1);
			const y1 = CY + RADIUS * Math.sin(a1);
			return {
				key: slice.key,
				color: slice.color,
				d: `M ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x1} ${y1}`
			};
		});
	});
</script>

<svg viewBox="0 0 100 100" width={size} height={size} class="donut" aria-hidden="true">
	<circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="var(--line)" stroke-width={STROKE} />
	{#each arcs as arc (arc.key)}
		<path d={arc.d} stroke={arc.color} stroke-width={STROKE} fill="none" stroke-linecap="butt" />
	{/each}
	{#if centerLabel}
		<text x="50" y="46" class="donut-label">{centerLabel}</text>
	{/if}
	{#if centerValue}
		<text x="50" y="58" class="donut-value">{centerValue}</text>
	{/if}
</svg>

<style>
	.donut {
		flex-shrink: 0;
	}

	.donut-label {
		fill: var(--ink-2);
		font-size: 6.5px;
		font-family: var(--font-mono);
		letter-spacing: 0.06em;
		text-anchor: middle;
	}

	.donut-value {
		fill: var(--ink);
		font-size: 10px;
		font-family: var(--font-mono);
		font-weight: 700;
		text-anchor: middle;
	}
</style>
