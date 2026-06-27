# CLAUDE.md — Sophia SEO Suite

Guidance for AI agents (and humans) working in **this** repository.

## What this project is

A modular, self-hosted **SEO/GEO automation suite** for SophiaXT. Its first-class
integration is an **installable Sophia Stack extension** (`extensions/sophia-stack/`)
that runs in-process via the host's `ctx` API; the same engine also powers a
platform-agnostic connector for standalone/other platforms. Everything proposes
**safe, reversible** SEO changes. Built **in parallel to** Sophia Stack, as its own
repo. See [`ARCHITECTURE.md`](ARCHITECTURE.md) and
[`docs/extension-integration.md`](docs/extension-integration.md).

**License:** proprietary — © SophiaXT LLC, all rights reserved (not open-source).

## Hard rules

1. **Never modify Sophia Stack.** It is the **Sophia Stack** repo
   (`Chorozion/Sophia-Stack`), checked out locally alongside this repo as a
   **read-only reference**. If Sophia Stack needs to expose something new, write
   it into [`docs/sophia-stack-extension-requirements.md`](docs/sophia-stack-extension-requirements.md)
   as a requirement and into the cross-session coordination channel — do not edit
   Sophia Stack source.
2. **Safety over velocity.** No tool may edit a live site directly by default.
   Everything flows: **draft → preview → approve → publish → (rollback)**.
   See [`docs/owner-safe-editing.md`](docs/owner-safe-editing.md).
3. **Security is paramount.** No hardcoded secrets, no plaintext secret storage,
   no aggressive scraping. Evaluate every customer-facing surface for security
   before adding features. See [`SECURITY.md`](SECURITY.md).
4. **Connectors must be non-destructive.** A connector may never delete or
   overwrite existing site content. It reads, drafts, and applies additive or
   explicitly-approved patches with a rollback path.
5. **No prohibited features.** No spam tools, no auto-comment bots, no fake
   rankings / fake indexing, no ranking promises.

## Build philosophy

- **Foundation first.** Build the skeleton, contracts, and one mock connector
  before any real automation. Don't jump ahead to article generation, Search
  Console, backlinks, or AI-visibility — those are later tiers.
- **Tier/module gating is first-class.** Every capability declares its tier and
  module in `packages/shared`. Disabled modules must be inert, not half-wired.
- **The connector interface is the contract.** All site I/O goes through
  `packages/connectors/core`. Modules never talk to a site directly.

## Layout & ownership

| Path | Purpose |
| --- | --- |
| `apps/dashboard` | Next.js owner/agency UI shell |
| `extensions/sophia-stack` | Installable Sophia Stack extension (primary integration) |
| `packages/core` | SEO engine modules (audit, crawler, seo, schema, ...) |
| `packages/connectors/core` | The connector interface (the contract) |
| `packages/connectors/sophia-stack` | Sophia Stack connector (mock-first) |
| `packages/connectors/<other>` | Stubs for WP/Wix/Webflow/Shopify/webhook |
| `packages/db` | Prisma schema + client |
| `packages/workers` | BullMQ background jobs |
| `packages/shared` | Tier/module config, shared types, env loader |
| `docs/` | Architecture + analysis + requirements docs |

## When extending

- New SEO capability → add a module under `packages/core`, register its tier in
  `packages/shared/src/modules.ts`, expose it through the dashboard only if its
  tier is enabled.
- New site platform → add `packages/connectors/<platform>` implementing the
  `SiteConnector` interface from `connectors/core`. Start as a stub.
- New site-side capability needed from Sophia Stack → document it in
  `docs/sophia-stack-extension-requirements.md`.

## Style

- TypeScript, ESM, `strict` on. Validate external input with Zod.
- Keep modules pure and testable; side effects (DB, network, queues) live at the
  edges (workers, connectors, db).
- Match the surrounding code's naming and comment density.

## Attribution

SophiaXT product. Commits in this repo:
`Co-Authored-By: Sophia <sophia@sophiaxt.com>`.
