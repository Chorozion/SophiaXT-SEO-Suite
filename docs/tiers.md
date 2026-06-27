# Tiers

> File: docs/tiers.md · Companion: `docs/modules.md`,
> source of truth in code: `packages/shared/src/tiers.ts`

Sophia SEO Suite ships capabilities in three tiers. Tiers are **additive**: a
higher tier includes everything below it. Module availability is gated by tier in
`packages/shared` — the dashboard and workers both read that registry, so a
module outside the active tier is invisible and unreachable, not half-wired.

## Tier 1 — Starter SEO

Foundational, safe, mostly read-only analysis plus low-risk edits.

- Site SEO audit
- Page title / meta editor
- Image alt-text checker
- Sitemap generator
- robots.txt helper
- `llms.txt` generator
- Basic schema generator
- Broken-link checker
- Missing-heading checker
- Local-business SEO checklist

## Tier 2 — Growth SEO

Content and planning. Anything that generates content defaults to **DRAFT**.

- Content planner
- AI article draft generator
- Service page generator
- Local landing page generator
- Internal-link suggestions
- FAQ generator
- JSON-LD schema builder
- Blog publishing queue
- Search Console connection *(later)*
- Weekly SEO report

## Tier 3 — Agency / SophiaXT Pro

Multi-site, teams, white-label, connectors.

- Multi-site dashboard
- Client management
- White-label reports
- **Sophia Stack connector**
- Webhook connector
- WordPress connector *(later)*
- Wix / Webflow / Shopify connectors *(later)*
- AI-visibility tracking *(later)*
- Backlink-opportunity tracking *(later)*
- Role-based permissions
- Approval workflows

## "(later)" items

Marked *(later)* are intentionally **not** in the first build. They are named so
the architecture can accommodate them, but building them now is out of scope. See
`TODO.md`.

## How gating works

```ts
import { TIERS, isModuleEnabled } from "@sophiaxt/seo-shared";

isModuleEnabled("schema-jsonld-builder", currentTier); // -> boolean
```

The registry maps each module → minimum tier. UI navigation, job registration,
and API routes all consult it. There is no per-feature `if (tier === ...)`
scattered through the code.
