# Architecture (deep dive)

> File: docs/architecture.md · Companion (overview): `../ARCHITECTURE.md`
> This is the engineering-detail companion to the root `ARCHITECTURE.md`.

Read `../ARCHITECTURE.md` first for the mental model and package map. This doc
goes deeper on the contracts that matter most.

## 1. The connector contract in detail

`packages/connectors/core` defines `SiteConnector`. It is shaped around **safe
SEO operations**, not generic CRUD. Three bands:

### Read band (no side effects)
```ts
getSite(): Promise<SiteStructure>
listPages(): Promise<PageSummary[]>
getPage(pageId: string): Promise<Page>
getBlocks(pageId: string): Promise<Block[]>      // when capabilities.supportsBlocks
getSeoState(): Promise<SiteSeoState>             // resolved title/meta/schema per page
```

### Plan band (pure intent — returns a ChangeSet, never writes)
```ts
planMetadataUpdate(input): Promise<ChangeSet>
planSchemaAddition(input): Promise<ChangeSet>
planSitemapUpdate(input): Promise<ChangeSet>
planLlmsTxtUpdate(input): Promise<ChangeSet>
```

A `ChangeSet` is `{ id, summary, ops: ConnectorOp[], preview: ChangePreview,
capabilityRequired }`. `ops` are connector-native but opaque to modules; the
`preview` is human-readable (before/after, affected targets).

### Apply band (guarded, reversible)
```ts
applyChangeSet(set: ChangeSet, opts: { approvedBy: Actor; idempotencyKey?: string }): Promise<Version>
publish(opts?): Promise<PublishResult>
rollback(versionId: string): Promise<RollbackResult>
listVersions(): Promise<Version[]>
```

`applyChangeSet` throws if the set isn't approved. It returns a `Version` even for
connectors without server-side versioning — in that case the Version is backed by
our own before-snapshot.

### Capabilities
```ts
interface ConnectorCapabilities {
  supportsBlocks: boolean;
  supportsDrafts: boolean;
  supportsRollback: boolean;       // true server-side rollback
  canEditMeta: boolean;
  canAddSchema: boolean;
  canEditSitemap: boolean;
  canEditLlmsTxt: boolean;
  versioning: "none" | "stack" | "addressable"; // Sophia Stack today = "stack"
}
```

Modules and UI branch on capabilities, never on connector identity.

## 2. Sophia Stack connector mapping (today)

| Contract method | Sophia Stack call | Notes |
| --- | --- | --- |
| `getSite` | `GET /api/sophia/model` | Whole model. |
| `getSeoState` | derive from model (R3 endpoint later) | title native; meta/schema inferred. |
| `planMetadataUpdate` | build `mset pages./.title` (+ `seo.*` when R1 lands) | returns ops, doesn't send. |
| `planSchemaAddition` | build `add` of `html` block w/ `<script ld+json>` | additive. |
| `applyChangeSet` | `POST /api/sophia/patch` | validate-before-commit. |
| `rollback` | `POST /api/sophia/rollback` | `versioning: "stack"` today. |
| `listVersions` | `GET /api/sophia/versions` | count today; list after R4. |

`capabilities` for Sophia Stack today: `canEditMeta` (titles native, full meta
after R1), `canAddSchema: true` (via html block), `supportsRollback: true`
(stack-style), `versioning: "stack"`.

## 3. Mock connector

`packages/connectors/sophia-stack` ships with a **mock backend** (in-memory model
seeded from a fixture mirroring Sophia Stack's `model.json`). This lets the entire
suite — audit, planning, preview, apply, rollback — run end-to-end with no live
Sophia Stack. The same connector class points at a real site by switching the
transport from the in-memory store to `fetch` against `SOPHIA_STACK_BASE_URL`.
The mapping table above is implemented once; only the transport differs.

## 4. Module execution model

```
worker (BullMQ) ─► load connector for site ─► module.analyze(ctx) ─► findings ─► db
                                            └► module.plan(ctx,…) ─► ChangeSet ─► Draft
```

Modules receive a `ModuleContext` whose `site` accessor is the connector's **read
band only** — a module literally cannot call `applyChangeSet`. Apply happens later,
from the approval flow, not from a module.

## 5. Persistence (Prisma / Postgres)

Core entities (see `packages/db/prisma/schema.prisma`): `Organization`, `User`,
`Membership` (role), `Site`, `ConnectorCredential` (encrypted), `AuditRun`,
`Finding`, `Draft`, `ChangeSetRecord`, `Version`, `Job`, `Report`. Drafts and
Versions are the spine of the safe-editing lifecycle; `AuditRun`/`Finding` are the
analysis outputs; `ConnectorCredential` stores encrypted per-site tokens.

## 6. Jobs (BullMQ / Redis)

Queues: `crawl`, `audit`, `report`. Workers respect crawler politeness (env:
concurrency, delay, robots). A request never blocks on a crawl — the dashboard
enqueues and subscribes to status.

## 7. Validation boundary

Every external input (API route body, connector response, AI output) is parsed
with **Zod** at the boundary. Internal functions then receive typed, trusted data.
Zod schemas live next to the types they validate in `packages/shared` and each
connector.

## 8. Security cross-cuts

See `SECURITY.md`. Highlights enforced in code structure: secrets only from env;
connector credentials encrypted at rest (`CONNECTOR_ENCRYPTION_KEY`); logging
redaction; RBAC gates on mutating routes; non-destructive connector contract.
