// Default to client-only for every route. The landing flips `prerender` back on
// to emit a static SEO-rich HTML at build time.
export const ssr = false;
export const prerender = false;
