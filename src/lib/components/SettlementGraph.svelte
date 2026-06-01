<script lang="ts">
	import type { Settlement } from '$lib/balance';
	import Avatar from '$lib/components/Avatar.svelte';
	import { formatAmount } from '$lib/money';
	import type { Member } from '$lib/types';

	type Props = {
		members: Member[];
		plan: Settlement[];
		currentMemberId: string | null;
		symbol: string;
		currency: string;
	};

	let { members, plan, currentMemberId, symbol, currency }: Props = $props();

	const NODE_R = 20;
	const ROW_GAP = 62;
	const PAD_TOP = 10;
	const PAD_BOTTOM = 8;
	const LABEL_H = 16;
	const VIEW_W = 300;
	const LEFT_X = 66;
	const RIGHT_X = VIEW_W - 66;

	const membersById = $derived(new Map(members.map((m) => [m.id, m])));

	// A settlement plan is bipartite: every transfer is debtor -> creditor and a member sits
	// on exactly one side. So we lay payers down the left, receivers down the right, and the
	// arrows never converge on a single hub the way the old circular layout did.
	const layout = $derived.by(() => {
		const payTotals = new Map<string, number>();
		const recvTotals = new Map<string, number>();
		let maxAmount = 1;
		for (const t of plan) {
			payTotals.set(t.from, (payTotals.get(t.from) ?? 0) + t.amount);
			recvTotals.set(t.to, (recvTotals.get(t.to) ?? 0) + t.amount);
			if (t.amount > maxAmount) maxAmount = t.amount;
		}
		const debtors = [...payTotals.keys()].sort((a, b) => payTotals.get(b)! - payTotals.get(a)!);
		const creditors = [...recvTotals.keys()].sort(
			(a, b) => recvTotals.get(b)! - recvTotals.get(a)!
		);

		const rows = Math.max(debtors.length, creditors.length);
		const centerY = PAD_TOP + NODE_R + ((rows - 1) * ROW_GAP) / 2;
		const height = PAD_TOP + NODE_R + (rows - 1) * ROW_GAP + NODE_R + LABEL_H + PAD_BOTTOM;

		function place(ids: string[], x: number) {
			const first = centerY - ((ids.length - 1) * ROW_GAP) / 2;
			return new Map(ids.map((id, i) => [id, { id, x, y: first + i * ROW_GAP }]));
		}
		const leftPos = place(debtors, LEFT_X);
		const rightPos = place(creditors, RIGHT_X);

		const nodes = [
			...[...leftPos.values()].map((p) => ({ ...p, side: 'left' as const })),
			...[...rightPos.values()].map((p) => ({ ...p, side: 'right' as const }))
		];

		const edges = plan
			.map((t) => {
				const a = leftPos.get(t.from);
				const b = rightPos.get(t.to);
				if (!a || !b) return null;
				const mine = t.from === currentMemberId || t.to === currentMemberId;
				const base = 1 + (t.amount / maxAmount) * 1.4;
				return {
					key: `${t.from}>${t.to}`,
					x1: a.x + NODE_R,
					y1: a.y,
					x2: b.x - NODE_R - 2,
					y2: b.y,
					width: mine ? base : base * 0.7,
					amount: t.amount,
					tone: mine ? 'mine' : 'other'
				};
			})
			.filter((e) => e !== null);

		return { nodes, edges, height };
	});

	function nodeName(id: string): string {
		if (id === currentMemberId) return 'YOU';
		return (membersById.get(id)?.name ?? '—').toUpperCase();
	}

	function arrowMarker(tone: string): string {
		return tone === 'mine' ? 'url(#kostos-arrow-mine)' : 'url(#kostos-arrow-other)';
	}
</script>

<svg
	viewBox="0 0 {VIEW_W} {layout.height}"
	class="net-svg"
	style="aspect-ratio: {VIEW_W} / {layout.height};"
	preserveAspectRatio="xMidYMid meet"
>
	<defs>
		<!-- userSpaceOnUse keeps arrowheads a fixed size instead of scaling with stroke width -->
		<marker id="kostos-arrow-mine" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
			<path d="M0 0 L8 4 L0 8 z" fill="var(--accent)" />
		</marker>
		<marker id="kostos-arrow-other" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
			<path d="M0 0 L8 4 L0 8 z" fill="var(--ink-3)" />
		</marker>
	</defs>

	{#each layout.edges as e (e.key)}
		{@const midX = (e.x1 + e.x2) / 2}
		{@const midY = (e.y1 + e.y2) / 2}
		<g class="edge edge-{e.tone}">
			<path
				class="edge-path"
				d="M{e.x1} {e.y1} C {midX} {e.y1} {midX} {e.y2} {e.x2} {e.y2}"
				fill="none"
				style="stroke-width: {e.width};"
				marker-end={arrowMarker(e.tone)}
			/>
			<g transform="translate({midX} {midY})">
				<rect x="-24" y="-9" width="48" height="18" rx="4" class="edge-label-bg" />
				<text x="0" y="3.5" text-anchor="middle" class="edge-label">
					{formatAmount(e.amount, symbol, currency)}
				</text>
			</g>
		</g>
	{/each}

	{#each layout.nodes as p (p.id)}
		<foreignObject x={p.x - 22} y={p.y - 22} width="44" height="44">
			<div class="node-fo" xmlns="http://www.w3.org/1999/xhtml">
				<Avatar member={membersById.get(p.id)} size="md" active={p.id === currentMemberId} />
			</div>
		</foreignObject>
		<text x={p.x} y={p.y + NODE_R + 14} text-anchor="middle" class="node-label">{nodeName(p.id)}</text>
	{/each}
</svg>

<style>
	.net-svg {
		width: 100%;
		max-width: 460px;
		display: block;
		margin: 0 auto;
	}

	.edge-path {
		fill: none;
	}

	.edge-mine .edge-path {
		stroke: var(--accent);
	}

	.edge-other .edge-path {
		stroke: var(--ink-3);
	}

	.edge-label-bg {
		fill: var(--bg);
		stroke: none;
	}

	.edge-label {
		font-size: 10.5px;
		font-family: var(--font-mono);
		font-weight: 600;
	}

	.edge-mine .edge-label {
		fill: var(--accent);
	}

	.edge-other .edge-label {
		fill: var(--ink-2);
	}

	.node-fo {
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
	}

	.node-label {
		fill: var(--ink-2);
		font-size: 8.5px;
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
	}
</style>
