# Roadmap

High-level direction. Detailed, checkable status lives in [`TODO.md`](TODO.md).
Tiers are defined in [`docs/tiers.md`](docs/tiers.md).

## Now — Foundation + v1.5 alignment (current)
- Monorepo, contracts, mock connector, audit skeleton, dashboard shell.
- **Sophia Stack extension** wired to `ctx` (real audit + safe metadata/schema).
- **Targets Stack v1.5 "Stable":** builds on native `<head>` SEO (R1), versions +
  targeted rollback (R2), `ctx.ai.embed`; one-click install scaffold (release
  channel + compatibility matrix + sync checklist).
- Proprietary governance + CI.

## v1.5 "Stable" — joint cut with Sophia Stack
- Finish one-click install interlock (confirm fetch format; publish `seo-suite-v0.2.0`).
- Consume R3/R4/R5 as the Stack ships them (retire self-emit/inline workarounds).
- Live-test in a running Stack; contribute the SEO half of the joint screenshots.
- Pin the compatibility matrix; cut v1.5 together.

## Next — Make Tier 1 real
- Unify the extension entry with `@sophiaxt/seo-core` (esbuild bundle).
- Real crawler (Playwright + Cheerio) with politeness controls.
- Full Tier 1 modules: alt-text, sitemap, robots, llms.txt, broken-link, headings,
  local-business checklist.
- Draft → preview → approve → apply persisted end-to-end (DB + RBAC).
- Live-test the extension inside a Sophia Stack deployment.

## Later — Tier 2 (Growth)
- Content planner + draft-only AI generators (article/service/landing/FAQ).
- Internal-link suggestions, JSON-LD builder, publishing queue, weekly report.
- Search Console connection.

## Future — Tier 3 (Agency / Pro)
- Multi-site dashboard, client management, white-label reports.
- Webhook connector; then WordPress / Wix / Webflow / Shopify connectors.
- Role-based permissions + approval workflows.
- AI-visibility and backlink-opportunity tracking.

## Depends on Sophia Stack
Tracked as requests in
[`docs/sophia-stack-extension-requirements.md`](docs/sophia-stack-extension-requirements.md)
and the cross-session coordination channel. Highest leverage: **native SEO
metadata rendered in `<head>`** (R1) and **enumerable versions + targeted rollback
via `ctx`** (R2).

## Explicit non-goals
Spam tooling, auto-comment/DM bots, fake rankings/indexing, ranking guarantees,
or any black-hat tactic. See [`SECURITY.md`](SECURITY.md).
