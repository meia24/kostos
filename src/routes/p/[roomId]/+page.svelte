<script lang="ts">
	import { page } from '$app/state';
	import { openRoom, readMembers, readProject } from '$lib/sync/doc';
	import { getCurrentMember, getCurrentProject } from '$lib/storage';
	import type { Member, Project } from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const handle = $derived(openRoom(roomId));

	let project = $state<Project | null>(null);
	let members = $state<Member[]>([]);
	let copied = $state(false);

	$effect(() => {
		const h = handle;
		const sync = () => {
			project = readProject(h);
			members = readMembers(h);
		};
		sync();
		h.project.observeDeep(sync);
		h.members.observeDeep(sync);
		return () => {
			h.project.unobserveDeep(sync);
			h.members.unobserveDeep(sync);
		};
	});

	const currentMemberId = $derived.by(() => getCurrentMember());
	const youMember = $derived(members.find((m) => m.id === currentMemberId) ?? null);

	const shareUrl = $derived.by(() => {
		const stored = getCurrentProject();
		if (!stored || stored.roomId !== roomId) return null;
		return `${location.origin}/join?room=${encodeURIComponent(roomId)}#${stored.secret}`;
	});

	async function copyShareUrl() {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			// clipboard blocked; surface the URL by selecting it instead
			const el = document.getElementById('share-url-display');
			if (el && el instanceof HTMLInputElement) el.select();
		}
	}
</script>

<svelte:head>
	<title>{project?.name ? `${project.name} · Kostos` : 'Kostos'}</title>
</svelte:head>

<div class="screen" data-page="dashboard">
	<header class="app-bar">
		<div class="row gap-8" style="flex: 1;">
			<span class="app-bar-title">{roomId}</span>
		</div>
		<div class="app-bar-title">Home</div>
		<div class="row gap-6" style="flex: 1; justify-content: flex-end;">
			<a href="/p/{roomId}/settings" class="icon-btn" aria-label="Settings">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
					<circle cx="12" cy="12" r="2.6" />
					<path d="M19 12a7 7 0 0 0-.16-1.5l2.05-1.58-2-3.46-2.43.83a7 7 0 0 0-2.59-1.5L13.5 2h-3l-.37 2.79a7 7 0 0 0-2.59 1.5l-2.43-.83-2 3.46L5.16 10.5A7 7 0 0 0 5 12a7 7 0 0 0 .16 1.5l-2.05 1.58 2 3.46 2.43-.83a7 7 0 0 0 2.59 1.5L10.5 22h3l.37-2.79a7 7 0 0 0 2.59-1.5l2.43.83 2-3.46-2.05-1.58A7 7 0 0 0 19 12z" />
				</svg>
			</a>
		</div>
	</header>

	<div class="scroll">
		<section class="hero-block">
			<div class="eyebrow">You are</div>
			<div class="hero-title">
				<span class="hero-emoji">{project?.emoji ?? '🏖'}</span>
				<span>{project?.name ?? 'Loading…'}</span>
			</div>
			{#if youMember}
				<p class="muted hero-sub">
					Signed in on this device as <strong>{youMember.name}</strong>.
				</p>
			{:else}
				<p class="muted hero-sub">No member claimed on this device yet.</p>
			{/if}
		</section>

		<section class="card share-card">
			<div class="row between" style="margin-bottom: 10px;">
				<span class="eyebrow">Invite token</span>
				<button class="btn btn-ghost copy-btn" type="button" onclick={copyShareUrl} disabled={!shareUrl}>
					{#if copied}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7" /></svg>
						<span>Copied</span>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 4H6a2 2 0 0 0-2 2v10" /></svg>
						<span>Copy link</span>
					{/if}
				</button>
			</div>
			<span class="token-pill">{roomId}</span>
			{#if shareUrl}
				<input id="share-url-display" class="share-url-display" value={shareUrl} readonly />
			{/if}
			<p class="dim share-hint">
				Anyone with this link joins instantly; the secret part lives in the URL fragment and is never sent to the server.
			</p>
		</section>

		<section class="members-section">
			<div class="section-head">
				<div class="eyebrow">Members</div>
				<span class="dim mono members-count-tag">{members.length} TOTAL</span>
			</div>
			<div class="card" style="padding: 4px;">
				{#each members as m, i (m.id)}
					{#if i > 0}<hr class="hairline" style="margin-left: 56px;" />{/if}
					<div class="list-item member-row">
						<div class="av av-them">{(m.name[0] ?? '?').toUpperCase()}</div>
						<div class="col" style="flex: 1;">
							<div class="member-name">{m.name}</div>
							<div class="dim member-meta">
								{m.id === currentMemberId ? 'YOU · this device' : 'No devices claimed yet'}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<p class="dim coming-soon">
			Expenses, stats, and settle-up flows ship in the next iteration.
		</p>
	</div>

	<nav class="tabbar">
		<a href="/p/{roomId}" class="tab active">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11.5L12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.5z" /></svg>
			</div>
			<span>HOME</span>
			<span class="tab-dot"></span>
		</a>
		<a href="/p/{roomId}/expenses" class="tab">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h14M5 12h14M5 17h9" /></svg>
			</div>
			<span>EXPENSES</span>
			<span class="tab-dot"></span>
		</a>
		<a class="fab" href="/p/{roomId}/add" aria-label="Add expense">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12" /></svg>
		</a>
		<a href="/p/{roomId}/stats" class="tab">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20h16M7 20V10M12 20V4M17 20v-7" /></svg>
			</div>
			<span>STATS</span>
			<span class="tab-dot"></span>
		</a>
		<a href="/p/{roomId}/people" class="tab">
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="9" r="3.2" /><circle cx="16.5" cy="10" r="2.4" /><path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5M14 19c.4-2.2 2-3.4 4-3.4s3.5 1.2 4 3.4" /></svg>
			</div>
			<span>PEOPLE</span>
			<span class="tab-dot"></span>
		</a>
	</nav>
</div>

<style>
	.hero-block {
		padding: 22px 0 18px;
	}

	.hero-title {
		font-family: var(--font-display);
		font-size: 38px;
		line-height: 1.05;
		letter-spacing: -0.02em;
		margin-top: 4px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.hero-emoji {
		font-size: 30px;
	}

	.hero-sub {
		margin: 12px 0 0;
		font-size: 13px;
		line-height: 1.5;
	}

	.share-card {
		display: flex;
		flex-direction: column;
	}

	.copy-btn {
		padding: 6px 10px;
		font-size: 12px;
		gap: 6px;
		border-radius: 999px;
		color: var(--ink-2);
	}

	.copy-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.share-url-display {
		margin-top: 12px;
		width: 100%;
		background: transparent;
		border: 1px dashed var(--line-2);
		border-radius: var(--radius-sm);
		padding: 8px 10px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--ink-3);
		outline: none;
	}

	.share-hint {
		font-size: 11px;
		font-family: var(--font-mono);
		line-height: 1.5;
		margin: 10px 0 0;
	}

	.members-section {
		margin-top: 8px;
	}

	.members-count-tag {
		font-size: 11px;
	}

	.member-row {
		padding: 12px;
	}

	.av-them {
		background: color-mix(in oklab, var(--ink) 12%, transparent);
		color: var(--ink);
	}

	.member-name {
		font-size: 14px;
		font-weight: 600;
	}

	.member-meta {
		font-size: 11px;
		font-family: var(--font-mono);
		margin-top: 2px;
	}

	.coming-soon {
		font-size: 11px;
		font-family: var(--font-mono);
		text-align: center;
		margin: 24px 0 0;
		line-height: 1.5;
	}
</style>
