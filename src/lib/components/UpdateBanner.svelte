<script lang="ts">
	import { onMount } from 'svelte';

	/* Service-worker registration.
	 *
	 * The PWA plugin runs in `autoUpdate` mode (vite.config.ts): a new SW skips waiting,
	 * claims open clients, and the page reloads onto the fresh build automatically. Combined
	 * with `cleanupOutdatedCaches`, this self-heals clients stuck on a pre-refactor precache.
	 *
	 * We still poll every 30 minutes so a long-lived session (PWA opened once, never closed)
	 * picks up new releases without waiting for a manual reload.
	 */

	const POLL_INTERVAL_MS = 30 * 60 * 1000;

	onMount(async () => {
		if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
		// Skip in dev: no built SW, and virtual:pwa-register would try to fetch /dev-sw.js (404).
		if (!import.meta.env.PROD) return;

		const { registerSW } = await import('virtual:pwa-register');
		registerSW({
			immediate: true,
			onRegistered(reg) {
				if (!reg) return;
				setInterval(() => {
					reg.update().catch(() => undefined);
				}, POLL_INTERVAL_MS);
			}
		});
	});
</script>
