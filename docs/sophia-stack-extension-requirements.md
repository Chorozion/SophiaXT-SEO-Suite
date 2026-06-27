# Sophia Stack — what the Suite still needs (requests)

> File: docs/sophia-stack-extension-requirements.md
> Status: REQUESTS to the Sophia Stack session (we never modify Sophia Stack)
> Predecessor: `sophia-stack-readonly-analysis.md` · Companion: `extension-integration.md`
> Audience: the Sophia Stack maintainers / Stack session

**Update (2026-06-27):** Sophia Stack shipped an **Extension API v1** and an
authoritative integration contract (`docs/extensions/sophia-seo-suite-contract.md`
in `Chorozion/Sophia-Stack`). The **connection mechanism is solved** — the Suite
now installs as an extension and uses `ctx` (see `extension-integration.md`). What
remains are capabilities the contract marks **(planned)** plus model-level SEO
fields. This doc is the Suite's prioritized ask; the live cross-session channel is
the coordination file the Stack session maintains.

Legend — Priority: **P0** (materially limits the Suite) · **P1** (important, has a
workaround) · **P2** (nice-to-have). Status: **contract(planned)** = already
acknowledged by the Stack's contract; **net-new** = not yet tracked there.

---

## R1 — First-class SEO metadata in the Site Model · P0 · net-new

Today only page `title` renders to `<head>`. Description, canonical, Open Graph,
Twitter, and JSON-LD have nowhere native to live, so the Suite stores them on a
(non-rendered) `pages.<route>.seo.*` path and they don't reach the served HTML.

**Ask:** an additive, optional `model.seo` (site) + `pages.<route>.seo` (page)
layer that `pageHead()` renders — `description`, `canonical`, `robots`, `openGraph`,
`twitter`, and `jsonLd[]`. Because it's plain model paths, the Suite already writes
it via `ctx.site.patch` (`mset`); it just needs the renderer to emit it. **This is
the single highest-leverage enabler** — it turns our metadata/schema tools from
"stored but not served" into fully effective.

## R2 — Targeted, enumerable version history + rollback via `ctx` · P0 · partly contract(planned)

`ctx.site.patch` snapshots + supports rollback **inside** the Stack, but `ctx`
exposes no way to **enumerate** versions or **trigger** a targeted rollback. The
Suite publishes discrete approved changes and must revert a specific one.

**Ask:** `ctx.versions.list()` → `[{ id, label, createdAt, summary }]`, an optional
`label` on `ctx.site.patch`, and `ctx.versions.rollbackTo(id)`. Makes our
`Version`/`rollback(versionId)` contract truthful in extension mode.

## R3 — Core-fired SEO + publish hooks · P1 · contract(planned)

`seo.audit.requested`, `site.beforePublish`, `site.afterPublish`,
`page.beforeSave` are valid hook names but **not fired by core**. We currently
drive re-audits off `page.afterSave` / `site.afterPatch` / `media.afterUpload` and
self-emit `seo.audit.requested`.

**Ask:** have core fire `seo.audit.requested` after content changes and the
publish/pre-save hooks, so audits and pre-publish checks trigger natively.

## R4 — Background job execution · P1 · contract(planned)

`ctx.jobs.register(name, fn)` accepts handlers but core doesn't schedule/run them.
We run audits inline in routes/hooks for now.

**Ask:** execute registered jobs so scheduled re-audits and weekly reports run
without an inline trigger.

## R5 — Admin panel rendering (`adminEntry`) · P1 · contract(planned)

The dashboard surfaces our `adminNav` but doesn't mount `adminEntry`. Our owner UI
is served from our own routes meanwhile.

**Ask:** the panel-mount contract so we can ship a real in-dashboard SEO panel
(audit view, metadata editor, schema tools).

## R6 — `ctx.ai.embed()` · P1 · contract(planned)

Throws "(planned)". Needed for keyword/content semantic mapping and internal-link
suggestions.

**Ask:** provider-agnostic embeddings via `ctx.ai.embed()`.

## R7 — Data-model registration via `ctx` · P1 · contract(planned)

We can read/write existing declared collections (`ctx.data.*`) but cannot declare
our own. The Suite wants to persist audits/reports/drafts as first-class
collections.

**Ask:** a `ctx.data.defineCollection(schema)` helper (or document the supported
`site:patch` to `data.collections.*` as the official path).

## R8 — `media:write` via `ctx` · P2 · contract(planned)

`ctx.media.list()` exists; no write capability. Needed to generate/store OG images
and to set alt text on media.

**Ask:** `ctx.media.upload()/update()` under a `media:write` grant.

## R9 — `audit:read` on `ctx` · P2 · contract(planned)

We can write audit entries but can't read them back through `ctx` (owners read via
`GET /api/sophia/audit`). For an in-panel activity feed we'd want a read.

**Ask:** `ctx.audit.list()` under the reserved `audit:read`.

## R10 — Configurable robots.txt / llms.txt + redirects · P2 · net-new

`robots.txt`/`llms.txt` are auto-derived and not configurable; there's no managed
redirect map for page renames.

**Ask:** `model.seo.robotsTxt` / `model.seo.llmsTxt` overrides and
`model.redirects[]` honored before route rendering.

---

## Integration principles (apply to all)

1. **Additive & optional** — existing sites/models keep working unchanged.
2. **Patchable via existing ops** — prefer plain model paths so the Suite writes
   them through `ctx.site.patch` with no new endpoint.
3. **Non-destructive** — keep validate-before-commit + snapshot semantics.
4. **Backward-compatible** — new `ctx` methods/permissions default to today's
   behavior.

Until R1/R2 land, the Suite operates as: **titles = applied & served**;
**description/canonical/OG/JSON-LD = applied to the model, served after R1**;
**targeted rollback = report-only**. The audit and tooling still deliver value;
the served-SEO surface grows as these ship.
