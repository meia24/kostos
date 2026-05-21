<script lang="ts">
	import type { Settlement } from '$lib/balance';
	import { formatAmount } from '$lib/money';
	import type { Member } from '$lib/types';

	type Props = {
		members: Member[];
		plan: Settlement[];
		currentMemberId: string | null;
		symbol: string;
	};

	let { members, plan, currentMemberId, symbol }: Props = $props();

	const VIEW_W = 320;
	const VIEW_H = 240;
	const CX = VIEW_W / 2;
	const CY = VIEW_H / 2;

	// Pack nodes onto a circle. Centre the current member at the top so the
	// incoming/outgoing arrows feel intuitive (you sit at "12 o'clock").
	const positions = $derived.by(() => {
		const sorted = [...members];
		const youIdx = currentMemberId ? sorted.findIndex((m) => m.id === currentMemberId) : -1;
		if (youIdx > 0) {
			const [you] = sorted.splice(youIdx, 1);
			sorted.unshift(you);
		}
		const radius = Math.min(VIEW_W, VIEW_H) / 2 - 38;
		const count = sorted.length;
		return sorted.map((m, i) => {
			const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
			return {
				...m,
				x: CX + radius * Math.cos(angle),
				y: CY + radius * Math.sin(angle)
			};
		});
	});

	const positionById = $derived(new Map(positions.map((p) => [p.id, p])));

	type Edge = {
		key: string;
		from: { x: number; y: number };
		to: { x: number; y: number };
		mid: { x: number; y: number };
		amount: number;
		tone: 'in' | 'out' | 'other';
	};

	// Quadratic curve offset so reciprocal edges don't overlap each other (rare but
	// worth handling). The 14px offset is enough to read each amount cleanly.
	const edges = $derived.by<Edge[]>(() => {
		const out: Edge[] = [];
		for (const t of plan) {
			const a = positionById.get(t.from);
			const b = positionById.get(t.to);
			if (!a || !b) continue;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const len = Math.hypot(dx, dy) || 1;
			const ux = dx / len;
			const uy = dy / len;
			// Clip ends so the arrowhead doesn't bury itself inside the node.
			const fromX = a.x + ux * 22;
			const fromY = a.y + uy * 22;
			const toX = b.x - ux * 22;
			const toY = b.y - uy * 22;
			const midX = (fromX + toX) / 2 + uy * 14;
			const midY = (fromY + toY) / 2 - ux * 14;
			const tone: Edge['tone'] =
				t.to === currentMemberId ? 'in' : t.from === currentMemberId ? 'out' : 'other';
			out.push({
				key: `${t.from}-${t.to}`,
				from: { x: fromX, y: fromY },
				to: { x: toX, y: toY },
				mid: { x: midX, y: midY },
				amount: t.amount,
				tone
			});
		}
		return out;
	});

	function arrowMarker(tone: Edge['tone']): string {
		if (tone === 'in') return 'url(#kostos-arrow-in)';
		if (tone === 'out') return 'url(#kostos-arrow-out)';
		return 'url(#kostos-arrow-other)';
	}

	function initial(name: string): string {
		return (name[0] ?? '?').toUpperCase();
	}
</script>

<svg viewBox="0 0 {VIEW_W} {VIEW_H}" class="net-svg" preserveAspectRatio="xMidYMid meet">
	<defs>
		<marker id="kostos-arrow-in" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
			<path d="M0 0 L8 4 L0 8 z" fill="var(--accent)" />
		</marker>
		<marker id="kostos-arrow-out" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
			<path d="M0 0 L8 4 L0 8 z" fill="var(--owe)" />
		</marker>
		<marker id="kostos-arrow-other" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
			<path d="M0 0 L8 4 L0 8 z" fill="var(--ink-3)" />
		</marker>
	</defs>

	{#each edges as e (e.key)}
		<g class="edge edge-{e.tone}">
			<path
				d="M{e.from.x} {e.from.y} Q {e.mid.x} {e.mid.y} {e.to.x} {e.to.y}"
				fill="none"
				marker-end={arrowMarker(e.tone)}
			/>
			<g transform="translate({e.mid.x} {e.mid.y})">
				<rect x="-24" y="-9" width="48" height="16" rx="4" class="edge-label-bg" />
				<text x="0" y="2.5" class="edge-label" text-anchor="middle">
					{formatAmount(e.amount, symbol)}
				</text>
			</g>
		</g>
	{/each}

	{#each positions as p (p.id)}
		{@const isYou = p.id === currentMemberId}
		<g transform="translate({p.x} {p.y})">
			<circle r="22" class="node-bg" class:node-you={isYou} />
			<text y="4" text-anchor="middle" class="node-initial">{initial(p.name)}</text>
			<text y="38" text-anchor="middle" class="node-label">
				{isYou ? 'YOU' : p.name.toUpperCase()}
			</text>
		</g>
	{/each}
</svg>

<style>
	.net-svg {
		width: 100%;
		display: block;
	}

	.edge path {
		stroke-width: 1.4;
	}

	.edge-in path { stroke: var(--accent); stroke-width: 1.8; }
	.edge-out path { stroke: var(--owe); stroke-width: 1.8; stroke-dasharray: 3 3; }
	.edge-other path { stroke: var(--ink-3); stroke-width: 1.2; }

	.edge-label-bg {
		fill: var(--bg-2);
		stroke: var(--line-2);
	}

	.edge-label {
		font-size: 10px;
		font-family: var(--font-mono);
		font-weight: 600;
	}

	.edge-in .edge-label { fill: var(--accent); }
	.edge-out .edge-label { fill: var(--owe); }
	.edge-other .edge-label { fill: var(--ink-2); }

	.node-bg {
		fill: var(--bg-2);
		stroke: var(--line-2);
		stroke-width: 1;
	}

	.node-you {
		stroke: var(--accent);
		stroke-width: 2.4;
	}

	.node-initial {
		fill: var(--ink);
		font-family: var(--font-sans);
		font-weight: 700;
		font-size: 12px;
	}

	.node-label {
		fill: var(--ink-2);
		font-size: 9px;
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
	}
</style>
