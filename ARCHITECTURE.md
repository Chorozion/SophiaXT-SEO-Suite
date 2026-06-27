# Sophia SEO Suite — Architecture

> File: ARCHITECTURE.md
> Status: DRAFT (foundation) · Audience: engineers + AI agents
> Companions: `docs/architecture.md` (deeper), `docs/modules.md`, `docs/tiers.md`,
> `docs/owner-safe-editing.md`, `docs/sophia-stack-readonly-analysis.md`

## 1. One-paragraph mental model

A **dashboard** lets an owner/agency pick a **site** and run **modules** (audit,
schema, etc.). Modules never touch the site directly — they go through a
**connector** that implements one **interface**. The connector translates the
suite's abstract intentions (read pages, update metadata, add schema, publish)
into the target platform's native operations (for Sophia Stack: model reads +
patch ops + the safe deployer). Every change is stored as a **draft**, shown as
a **preview**, gated by **approval**, written to an **audit log**, and reversible
through a **rollback** path when the connector exposes versioning. Long-running
work (crawls, audits, report generation) runs as **background jobs**.

```
                    ┌───────────────────────────────────────────┐
                    │  apps/dashboard  (Next.js App Router)       │
                    │  owner / agency UI · approvals · previews   │
                    └───────────────┬─────────────────────────────┘
                                    │ server actions / API routes
              ┌─────────────────────┼──────────────────────────────┐
              │                     │                              │
   ┌──────────▼─────────┐ ┌─────────▼──────────┐      ┌────────────▼───────────┐
   │  packages/core      │ │  packages/workers  │      │  packages/db (Prisma)  │
   │  SEO engine modules │ │  BullMQ processors │      │  sites, drafts, audit, │
   │  (pure logic)       │ │  (crawl/audit/rpt) │      │  versions, jobs, users │
   └──────────┬──────────┘ └─────────┬──────────┘      └────────────────────────┘
              │                       │
              │   all site I/O via    │
              ▼                       ▼
        ┌───────────────────────────────────────────────┐
        │  packages/connectors/core  — SiteConnector     │
        │  read · draft · preview · apply · publish ·    │
        │  rollback · listVersions  (the CONTRACT)       │
        └───────────────┬───────────────────────────────┘
            ┌───────────┼───────────┬───────────┬─────────┐
            ▼           ▼           ▼           ▼         ▼
      sophia-stack   wordpress    wix/webflow  shopify  webhook
      (mock-first)   (stub)       (stub)       (stub)   (stub)
```

## 2. Packages

| Package | Responsibility | Depends on |
| --- | --- | --- |
| `@sophiaxt/seo-shared` | Tier/module registry, shared types, env loader, result types. The vocabulary everything else speaks. | — |
| `@sophiaxt/seo-db` | Prisma schema + client. Persistence for sites, drafts, audits, versions, jobs, users/roles. | shared |
| `@sophiaxt/seo-connector-core` | The `SiteConnector` interface + capability flags + the abstract change/draft/version types. **The contract.** | shared |
| `@sophiaxt/seo-connector-*` | Platform connectors. `sophia-stack` is implemented (mock backend first); others are stubs. | connector-core, shared |
| `@sophiaxt/seo-core` | SEO engine modules. Pure logic — given site data, produce findings/changes. Never opens a socket itself. | shared, connector-core |
| `@sophiaxt/seo-workers` | BullMQ processors for crawl/audit/report jobs. Glue between core, connectors, db, queue. | core, db, connectors |
| `@sophiaxt/seo-dashboard` | Next.js app. UI + server actions. Orchestrates the above. | all |
| `@sophiaxt/seo-ext-sophia-stack` | The installable **Sophia Stack extension** — wires the engine to `ctx`. | (self-contained at runtime) |

Dependency direction is one-way (UI → workers/core → connectors → shared/db).
`core` modules are kept pure so they're testable without a live site.

## 3. The connector contract (why it's the center)

The connector is the only thing that knows how a specific website works. Its
interface is intentionally shaped around **safe SEO operations**, not generic
CRUD:

- **Read:** `getSite`, `listPages`, `getPage`, `getBlocks` (if exposed),
  `getSeoState`.
- **Propose (never auto-applies):** `planMetadataUpdate`, `planSchemaAddition`,
  `planSitemapUpdate`, `planLlmsTxtUpdate` → return a **ChangeSet** describing
  the intended edit + a human-readable preview, **without** touching the site.
- **Apply (guarded):** `applyChangeSet(changeSet, { approvedBy })` → only runs
  after approval; returns a `Version` handle.
- **Publish / Rollback:** `publish`, `rollback(versionId)`, `listVersions`.

Each connector advertises `capabilities` (e.g. `supportsRollback`,
`supportsBlocks`, `supportsDrafts`, `canEditMeta`, `canAddSchema`). Modules and
the UI degrade gracefully against capabilities — a connector that can't roll back
shows a louder confirmation and a manual-revert note.

### Mapping to Sophia Stack

| Suite operation | Sophia Stack mechanism |
| --- | --- |
| `getSite` / `listPages` / `getBlocks` | Read the addressable **Site Model** (pages → typed blocks with stable ids). |
| `planMetadataUpdate` | Compose a `mset` patch op on page title / meta paths — **return it, don't send**. |
| `planSchemaAddition` | Compose an `add` of an `html` block carrying a `<script type="application/ld+json">`. |
| `applyChangeSet` | Send the staged patch ops to the site's patch endpoint. |
| `publish` / `rollback` | The non-destructive deployer (backup → atomic swap → health-verify → rollback). |

This is why Sophia Stack is the ideal first target: its patch engine is already a
non-destructive, addressable, reversible edit primitive. The connector mostly
**translates SEO intent into patch ops** and leans on the deployer for safety.

### Primary Stack integration: the extension

Sophia Stack shipped an **Extension API v1**, so the Suite's first-class Stack
integration is an **installed extension** (`extensions/sophia-stack/`) that runs
in-process via the host's permissioned `ctx` API — not an external HTTP client.
The same `SiteConnector` engine is reused: the extension wires it through a
`CtxTransport` (`ctx.site.read`/`ctx.site.patch`), while the HTTP/mock transports
serve standalone mode and tests. Reads use `ctx.site.read`; every write goes
through `ctx.site.patch` (validate-before-commit + snapshot + rollback + audit,
automatic); AI uses `ctx.ai.generate`. Full detail:
[`docs/extension-integration.md`](docs/extension-integration.md).

## 4. Data lifecycle of a change

```
crawl/audit ──► finding ──► module proposes ChangeSet ──► stored as Draft
   (worker)                      (core + connector.plan*)        (db)
                                                                  │
 owner opens dashboard ──► sees preview/diff ──► Approve ─────────┘
                                                  │
                                  connector.applyChangeSet ──► Version (db + site)
                                                  │
                                       publish ──► live ; rollback(versionId) reverts
```

Nothing is written to the live site between "module proposes" and "Approve".
Generated **content** (Tier 2) is a Draft of `kind=content` and additionally
defaults to an unpublished state on the site.

## 5. Tier / module gating

`packages/shared/src/tiers.ts` + `modules.ts` define which modules exist in which
tier. The dashboard and workers both consult this registry; a disabled module is
not registered as a job, not shown in the UI, and not reachable via API. Gating is
data, not scattered `if` checks.

## 6. Background jobs

Crawls, audits, broken-link checks, and report generation are queued on BullMQ
(Redis). Workers pull site data **through the connector**, run `core` logic, and
write findings/drafts to Postgres. This keeps the request path fast and respects
crawler politeness (concurrency + delay from env).

## 7. What's deliberately NOT here yet

Search Console, backlink discovery, AI-visibility tracking, Reddit/social, real
article publishing pipelines, and the non-Sophia-Stack connectors are **stubs or
absent**. See `TODO.md` and `docs/tiers.md` for the staged plan.
