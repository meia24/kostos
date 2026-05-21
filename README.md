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

## Design source

The UI is ported from the design package at `chats/` and `project/` (HTML/CSS/JS prototype, dark + lime aesthetic, 13 mobile screens). The prototype is reference only; runtime code lives in `src/`.
