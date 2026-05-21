<script lang="ts">
	import { goto } from '$app/navigation';
	import { parseToken } from '$lib/token';

	let token = $state('');
	let error = $state<string | null>(null);

	function onContinue(event: SubmitEvent) {
		event.preventDefault();
		const parsed = parseToken(token);
		if (!parsed) {
			error = 'That token does not look right. Paste the full invite link, or `ROOM.SECRET`.';
			return;
		}
		error = null;
		goto(`/join?room=${encodeURIComponent(parsed.roomId)}#${parsed.secret}`);
	}

	function onStartNew() {
		goto('/new');
	}
</script>

<svelte:head>
	<title>Kostos · Even out group expenses</title>
</svelte:head>

<div class="screen" data-page="join">
	<header class="app-bar">
		<div class="row gap-8" style="flex: 1;"></div>
		<div class="app-bar-title">Join a group</div>
		<div class="row gap-6" style="flex: 1; justify-content: flex-end;"></div>
	</header>

	<div class="scroll" style="padding-top: 36px;">
		<div class="col brand">
			<div class="brand-mark" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M5 6h14M5 12h14M5 18h9" />
					<circle cx="19" cy="18" r="2.5" fill="currentColor" stroke="none" />
				</svg>
			</div>
			<div class="h1" style="margin-top: 18px;">Kostos</div>
			<p class="muted brand-tagline">Even out group expenses with just a token, no accounts needed.</p>
		</div>

		<form onsubmit={onContinue}>
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

			<button type="submit" class="btn btn-primary btn-block" style="margin-top: 22px;">
				Continue
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
			</button>
		</form>

		<div class="row or-row">
			<div class="rule"></div>
			<span class="dim mono or-label">OR</span>
			<div class="rule"></div>
		</div>

		<button class="btn btn-block" onclick={onStartNew}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12" /></svg>
			<span>Start a new group</span>
		</button>

		<section class="card how-card" aria-labelledby="how-it-works">
			<div class="eyebrow" id="how-it-works" style="margin-bottom: 8px;">How it works</div>
			<ol class="how-list">
				<li>
					<span class="num step-num">01</span>
					<span>One person creates a group and shares the token</span>
				</li>
				<li>
					<span class="num step-num">02</span>
					<span>Anyone with the token joins, then picks or creates a member</span>
				</li>
				<li>
					<span class="num step-num">03</span>
					<span>Track expenses, settle up offline-first</span>
				</li>
			</ol>
		</section>
	</div>
</div>

<style>
	.brand {
		align-items: center;
		margin-bottom: 36px;
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

	.brand-tagline {
		font-size: 13px;
		margin: 4px 0 0;
		text-align: center;
		max-width: 240px;
		line-height: 1.5;
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

	.or-row {
		gap: 8px;
		margin: 26px 0 18px;
		align-items: center;
	}

	.or-label {
		font-size: 11px;
		letter-spacing: 0.08em;
	}

	.rule {
		flex: 1;
		height: 1px;
		background: var(--line);
	}

	.how-card {
		margin-top: 28px;
	}

	.how-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.how-list li {
		display: flex;
		gap: 10px;
		align-items: flex-start;
	}

	.step-num {
		width: 18px;
		color: var(--accent);
		font-weight: 600;
		font-size: 12px;
		margin-top: 1px;
	}

	.how-list li span:last-child {
		font-size: 13px;
		color: var(--ink-2);
		line-height: 1.5;
	}
</style>
