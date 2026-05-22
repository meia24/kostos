<script lang="ts">
	import { onMount } from 'svelte';

	/* Service-worker update notifier.
	 *
	 * The PWA plugin is configured in `prompt` mode (vite.config.ts): a new SW is installed
	 * but stays in `waiting` until we call its skipWaiting(). This component listens for that
	 * state, shows a small pill, and lets the user trigger the refresh on their own time.
	 *
	 * Long-lived sessions are also covered: every 30 minutes we ask the SW to re-check the
	 * server for an updated build. Without this, a user who opens the PWA once and never
	 * closes it would never see new releases.
	 */

	let needRefresh = $state(false);
	let updating = $state(false);
	let triggerUpdate: (() => Promise<void>) | null = null;

	const POLL_INTERVAL_MS = 30 * 60 * 1000;

	onMount(async () => {
		if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

		const { registerSW } = await import('virtual:pwa-register');
		const updateSW = registerSW({
			immediate: true,
			onNeedRefresh() {
				needRefresh = true;
			},
			onRegistered(reg) {
				if (!reg) return;
				setInterval(() => {
					reg.update().catch(() => undefined);
				}, POLL_INTERVAL_MS);
			}
		});

		triggerUpdate = async () => {
			updating = true;
			await updateSW(true);
		};
	});

	async function onUpdate() {
		if (!triggerUpdate) return;
		await triggerUpdate();
	}

	function dismiss() {
		needRefresh = false;
	}
</script>

{#if needRefresh}
	<div class="update-banner" role="status" aria-live="polite">
		<span class="update-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 4v10M7 10l5 5 5-5" />
				<path d="M5 20h14" />
			</svg>
		</span>
		<span class="update-text">A new version is ready</span>
		<button type="button" class="dismiss-btn" onclick={dismiss} aria-label="Dismiss">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
				<path d="M6 6l12 12M18 6L6 18" />
			</svg>
		</button>
		<button type="button" class="update-btn" onclick={onUpdate} disabled={updating}>
			{updating ? 'Updating…' : 'Update'}
		</button>
	</div>
{/if}

<style>
	.update-banner {
		position: fixed;
		left: 50%;
		top: calc(12px + env(safe-area-inset-top, 0px));
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 8px 8px 14px;
		background: var(--bg-2);
		border: 1px solid var(--line);
		border-radius: 999px;
		box-shadow: 0 6px 20px -8px color-mix(in oklab, black 50%, transparent);
		z-index: 1200;
		max-width: calc(100vw - 24px);
		animation: drop-in 0.22s ease-out;
	}

	.update-icon {
		display: inline-flex;
		color: var(--accent);
	}

	.update-icon svg {
		width: 16px;
		height: 16px;
	}

	.update-text {
		font-size: 13px;
		font-weight: 500;
		color: var(--ink);
	}

	.dismiss-btn {
		display: inline-flex;
		width: 26px;
		height: 26px;
		align-items: center;
		justify-content: center;
		border: 0;
		background: transparent;
		color: var(--ink-3);
		border-radius: 999px;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.dismiss-btn svg {
		width: 14px;
		height: 14px;
	}

	.update-btn {
		background: var(--accent);
		color: var(--accent-ink);
		border: 0;
		border-radius: 999px;
		padding: 7px 14px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.update-btn:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	@keyframes drop-in {
		from { opacity: 0; transform: translate(-50%, -10px); }
		to { opacity: 1; transform: translate(-50%, 0); }
	}
</style>
