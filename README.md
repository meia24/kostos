# Kostos

Privacy-first group expense splitter PWA. No accounts: projects live behind a secret token that you share, and other devices join by pasting it.

## Stack

- SvelteKit 5 + TypeScript (strict runes mode)
- `@vite-pwa/sveltekit` for manifest, service worker, install prompt
- Self-hosted fonts via `@fontsource/*` (Inter, JetBrains Mono, Instrument Serif)
- Local-first state via Y.js + y-indexeddb; sync layer (y-websocket + AES-GCM) ships in a later iteration

## Develop

```sh
npm install
npm run dev
```

Open http://localhost:5173/. The Join screen is the entry route.

## Build

```sh
npm run check
npm run build
npm run preview
```

The build emits a static bundle to `build/` (adapter-static, SPA fallback on `200.html`). The marketing landing at `/` is prerendered for SEO; all other routes hydrate client-side.

## Deploy

Two supported targets, same build output, same `/sync/<roomId>` WebSocket route.

### Cloudflare Workers (with Durable Objects)

```sh
wrangler login
npm run cf:deploy
```

`worker/index.ts` is the Worker entry: it routes `/sync/*` to a `SyncRoom` Durable Object (defined in `src/lib/server/sync-do.ts`) and falls through to the static assets binding for everything else. The DO uses Hibernating WebSockets, so idle rooms cost no CPU time. Configuration lives in `wrangler.toml`.

### Self-host (Docker or any Node host)

```sh
docker build -t kostos .
docker run -p 8080:8080 kostos
```

Or directly:

```sh
npm run build
node scripts/serve.js
```

`scripts/serve.js` serves the static bundle and handles `/sync/<roomId>` WebSocket upgrades on the same port (default 8080). History is in-memory, capped at 1000 messages per room; swap for a persistent store if you need durability across restarts.

### Dev sync

`vite dev` proxies `/sync/*` to `ws://localhost:1234`, where the legacy `npm run sync` script (a tiny `ws` relay) runs. Skip the relay for offline-only dev — IndexedDB persistence keeps your group state local.

## Design source

The UI is ported from the design package at `chats/` and `project/` (HTML/CSS/JS prototype, dark + lime aesthetic, 13 mobile screens). The prototype is reference only; runtime code lives in `src/`.
