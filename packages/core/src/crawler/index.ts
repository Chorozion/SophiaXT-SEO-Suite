/**
 * Crawler — PLACEHOLDER (foundation).
 *
 * Playwright + Cheerio page fetching behind politeness controls (robots, concurrency, delay from env). Feeds audit/link/heading/alt-text checks with real page DOM. All site reads still go through a connector where possible; the crawler is for live HTML the connector can't surface.
 *
 * Not implemented yet. See TODO.md and docs/modules.md. When implemented, export
 * `SeoModule` instances here and register them in ../registry.ts (tier-gated).
 */
export {};
