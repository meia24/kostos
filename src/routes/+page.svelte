<script lang="ts">
	import { goto } from '$app/navigation';
	import { PROJECT_COLOR_VALUES, tileBackground } from '$lib/colors';
	import { listProjects, type ProjectRef } from '$lib/storage';
	import { parseToken } from '$lib/token';

	let projects = $state<ProjectRef[]>([]);
	let tokenInputOpen = $state(false);
	let token = $state('');
	let error = $state<string | null>(null);

	$effect(() => {
		projects = listProjects();
	});

	const hasProjects = $derived(projects.length > 0);

	function onJoinSubmit(event: SubmitEvent) {
		event.preventDefault();
		const parsed = parseToken(token);
		if (!parsed) {
			error = 'That token does not look right. Paste the full invite link, or `ROOM.SECRET`.';
			return;
		}
		error = null;
		goto(`/join?room=${encodeURIComponent(parsed.roomId)}#${parsed.secret}`);
	}

	function relativeDay(ts: number | undefined): string {
		if (!ts) return '';
		const days = Math.round((Date.now() - ts) / (86_400 * 1000));
		if (days <= 0) return 'today';
		if (days === 1) return 'yesterday';
		if (days < 7) return `${days} days ago`;
		if (days < 30) return `${Math.round(days / 7)}w ago`;
		return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}
</script>

<svelte:head>
	<title>Kostos · Even out group expenses</title>
</svelte:head>

<div class="screen" data-page="landing">
	<div class="scroll landing-scroll">
		<div class="col brand">
			<div class="brand-mark" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M5 6h14M5 12h14M5 18h9" />
					<circle cx="19" cy="18" r="2.5" fill="currentColor" stroke="none" />
				</svg>
			</div>
			<div class="h1 brand-name">Kostos</div>
			<p class="muted brand-tagline">Even out group expenses with just a token, no accounts needed.</p>
		</div>

		{#if hasProjects}
			<section class="projects-section">
				<div class="section-head">
					<div class="eyebrow">Your groups</div>
					<span class="dim mono section-count">{projects.length}</span>
				</div>
				<div class="card projects-list">
					{#each projects as p, i (p.roomId)}
						{#if i > 0}<hr class="hairline" style="margin-left: 56px;" />{/if}
						<a class="project-row" href="/p/{p.roomId}">
							<span
								class="project-tile"
								style="background: {tileBackground(p.color ?? 'lime')}; color: {PROJECT_COLOR_VALUES[
									p.color ?? 'lime'
								]};"
							>
								{p.emoji ?? '🏠'}
							</span>
							<span class="col project-text">
								<span class="project-name">{p.name}</span>
								<span class="dim mono project-meta">
									{p.roomId}{#if p.lastActiveAt}<span class="meta-sep">·</span>{relativeDay(
											p.lastActiveAt
										)}{/if}
								</span>
							</span>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="project-chevron">
								<path d="M9 6l6 6-6 6" />
							</svg>
						</a>
					{/each}
				</div>
			</section>

			<div class="row gap-8 action-row">
				<a class="btn action-btn" href="/new">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12" /></svg>
					<span>New group</span>
				</a>
				<button
					class="btn action-btn"
					type="button"
					aria-expanded={tokenInputOpen}
					onclick={() => (tokenInputOpen = !tokenInputOpen)}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
					<span>Join with token</span>
				</button>
			</div>
		{:else}
			<section class="value-props">
				<div class="value-card">
					<div class="value-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 11V8a6 6 0 0 1 12 0v3" /><rect x="4" y="11" width="16" height="10" rx="2" /></svg>
					</div>
					<div class="col">
						<div class="value-title">End-to-end encrypted</div>
						<div class="dim value-sub">Your secret token never leaves your device. The sync server only sees opaque ciphertext.</div>
					</div>
				</div>
				<div class="value-card">
					<div class="value-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M5 6h14M5 18h14" /></svg>
					</div>
					<div class="col">
						<div class="value-title">No accounts, no email</div>
						<div class="dim value-sub">A group is just a token. Share it; everyone joins. No sign-up, no password reset.</div>
					</div>
				</div>
				<div class="value-card">
					<div class="value-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12h2M19 12h2M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /><circle cx="12" cy="12" r="4" /></svg>
					</div>
					<div class="col">
						<div class="value-title">Live sync, works offline</div>
						<div class="dim value-sub">Every device with the token sees the same numbers in real time. Add expenses on a plane; they sync when you're back.</div>
					</div>
				</div>
				<div class="value-card">
					<div class="value-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
					</div>
					<div class="col">
						<div class="value-title">Open source</div>
						<div class="dim value-sub">Inspect the code, host the sync server yourself, fork it. No vendor lock-in.</div>
					</div>
				</div>
			</section>

			<a class="btn btn-primary btn-block primary-cta" href="/new">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12" /></svg>
				<span>Create your first group</span>
			</a>

			<button
				type="button"
				class="btn btn-block"
				aria-expanded={tokenInputOpen}
				onclick={() => (tokenInputOpen = !tokenInputOpen)}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
				<span>Or join with a token</span>
			</button>
		{/if}

		{#if tokenInputOpen}
			<form class="card token-form" onsubmit={onJoinSubmit}>
				<div class="eyebrow" style="margin-bottom: 8px;">Paste a group token</div>
				<div class="input-wrap">
					<input
						class="input token-input"
						placeholder="PRT-XXXX-XXXX"
						bind:value={token}
						autocomplete="off"
						autocapitalize="characters"
						spellcheck="false"
						aria-invalid={error ? 'true' : 'false'}
					/>
					<button type="button" class="icon-btn qr-btn" aria-label="Scan QR code" onclick={() => goto('/scan')}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
							<rect x="3" y="3" width="7" height="7" rx="1" />
							<rect x="14" y="3" width="7" height="7" rx="1" />
							<rect x="3" y="14" width="7" height="7" rx="1" />
							<rect x="14" y="14" width="3" height="3" />
							<rect x="18" y="18" width="3" height="3" />
							<rect x="14" y="18" width="3" height="3" />
							<rect x="18" y="14" width="3" height="3" />
						</svg>
					</button>
				</div>
				<div class="dim hint">OR PASTE A FULL LINK FROM YOUR INVITE</div>
				{#if error}
					<div class="error" role="alert">{error}</div>
				{/if}
				<button type="submit" class="btn btn-primary btn-block continue-btn">
					Continue
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.landing-scroll {
		padding-top: 36px;
	}

	.brand {
		align-items: center;
		margin-bottom: 28px;
	}

	.brand-mark {
		width: 64px;
		height: 64px;
		border-radius: 22px;
		background: var(--accent);
		color: var(--accent-ink);
		display: grid;
		place-items: center;
		box-shadow: 0 14px 30px -10px color-mix(in oklab, var(--accent) 50%, transparent);
	}

	.brand-name {
		margin-top: 18px;
	}

	.brand-tagline {
		font-size: 13px;
		margin: 4px 0 0;
		text-align: center;
		max-width: 260px;
		line-height: 1.5;
	}

	.projects-section {
		margin-bottom: 16px;
	}

	.section-count {
		font-size: 11px;
	}

	.projects-list {
		padding: 4px;
	}

	.project-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		text-decoration: none;
		color: inherit;
	}

	.project-tile {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		font-size: 22px;
		flex-shrink: 0;
	}

	.project-text {
		flex: 1;
		min-width: 0;
		gap: 2px;
	}

	.project-name {
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.project-meta {
		font-size: 11px;
		display: inline-flex;
		gap: 6px;
		align-items: center;
	}

	.meta-sep {
		opacity: 0.5;
	}

	.project-chevron {
		width: 16px;
		height: 16px;
		color: var(--ink-3);
		flex-shrink: 0;
	}

	.action-row {
		align-items: stretch;
	}

	.action-btn {
		flex: 1;
		justify-content: center;
	}

	.value-props {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 22px;
	}

	.value-card {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}

	.value-icon {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		background: color-mix(in oklab, var(--accent) 14%, transparent);
		color: var(--accent);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.value-icon svg {
		width: 16px;
		height: 16px;
	}

	.value-title {
		font-size: 13px;
		font-weight: 600;
	}

	.value-sub {
		font-size: 12px;
		line-height: 1.5;
		margin-top: 2px;
	}

	.primary-cta {
		margin-bottom: 8px;
	}

	.token-form {
		margin-top: 14px;
	}

	.input-wrap {
		position: relative;
	}

	.token-input {
		font-family: var(--font-mono);
		letter-spacing: 0.08em;
		padding-right: 48px;
		text-transform: uppercase;
	}

	.qr-btn {
		position: absolute;
		right: 6px;
		top: 6px;
		border: 0;
	}

	.hint {
		font-size: 11px;
		font-family: var(--font-mono);
		margin-top: 8px;
		letter-spacing: 0.02em;
	}

	.error {
		margin-top: 10px;
		font-size: 12px;
		color: var(--owe);
		font-family: var(--font-mono);
		line-height: 1.5;
	}

	.continue-btn {
		margin-top: 14px;
	}
</style>
