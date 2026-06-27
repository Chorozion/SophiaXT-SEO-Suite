# Sophia Stack — what the Suite still needs (requests)

> File: docs/sophia-stack-extension-requirements.md
> Status: REQUESTS to the Sophia Stack session (we never modify Sophia Stack)
> Predecessor: `sophia-stack-readonly-analysis.md` · Companion: `extension-integration.md`
> Audience: the Sophia Stack maintainers / Stack session

**Update (2026-06-27, v1.5 cycle):** Sophia Stack shipped the **Extension API v1**
and is now driving to **v1.5 "Stable"** (joint cut). Several top asks have **landed**:
**R1 (native SEO `<head>` render), R2 (enumerable versions + targeted rollback),
and `ctx.ai.embed`** are SHIPPED — the Suite `0.2.0` builds on them and now
`requires.sophiaStack ">=1.5.0"`. The Stack has committed to ship **R3, R4, R5**
this same cycle. This doc tracks the remaining asks; the live channel is the
coordination file the Stack session maintains.

Legend — Priority: **P0** · **P1** · **P2**. Status: **✅ SHIPPED**, **🔜 this
cycle** (Stack committed for v1.5), or **planned**.

---

## R1 — First-class SEO metadata in the Site Model · P0 · ✅ SHIPPED

`model.seo` (site) + `pages.<route>.seo` (page) — `description`, `canonical`,
`robots`, `openGraph{title,description,image,type,siteName}`, `twitter{card,site}`,
`jsonLd[]` — are written via `ctx.site.patch` and **rendered in `<head>`** (page
overrides site; all escaped; JSON-LD script-safe). The Suite's stored-but-not-
served shim is **removed**; `/optimize-meta` and `/add-schema` now take effect.

## R2 — Targeted, enumerable version history + rollback via `ctx` · P0 · ✅ SHIPPED

`ctx.versions.list()` → `[{ id, ts, label }]`; `ctx.site.patch(ops, label)` names
the snapshot; `ctx.versions.rollbackTo(id)` reverts one change (snapshots current
first). REST: `GET /api/sophia/versions`, `POST /api/sophia/rollback {id}`. The
Suite's `CtxTransport`, connector `listVersions`/`rollback(id)`, and the extension's
`/versions` + `/rollback` routes use these directly.

## R-embed — `ctx.ai.embed()` · P1 · ✅ SHIPPED

`ctx.ai.embed([texts])` → vectors (OpenAI-compatible providers). Used by the
extension's read-only `/suggest-links` (cosine similarity between page embeddings).

## R3 — Core-fired SEO + publish hooks · P1 · 🔜 this cycle

`seo.audit.requested`, `site.beforePublish`, `site.afterPublish`,
`page.beforeSave` are valid hook names but **not fired by core**. We currently
drive re-audits off `page.afterSave` / `site.afterPatch` / `media.afterUpload` and
self-emit `seo.audit.requested`.

**Ask:** have core fire `seo.audit.requested` after content changes and the
publish/pre-save hooks, so audits and pre-publish checks trigger natively.

## R4 — Background job execution · P1 · 🔜 this cycle

`ctx.jobs.register(name, fn)` accepts handlers but core doesn't schedule/run them.
We run audits inline in routes/hooks for now.

**Ask:** execute registered jobs so scheduled re-audits and weekly reports run
without an inline trigger.

## R5 — Admin panel rendering (`adminEntry`) · P1 · 🔜 this cycle

The dashboard surfaces our `adminNav` but doesn't mount `adminEntry`. Our owner UI
is served from our own routes meanwhile.

**Ask:** the panel-mount contract so we can ship a real in-dashboard SEO panel
(audit view, metadata editor, schema tools).

## R7 — Data-model registration via `ctx` · P1 · planned

We can read/write existing declared collections (`ctx.data.*`) but cannot declare
our own. The Suite wants to persist audits/reports/drafts as first-class
collections.

**Ask:** a `ctx.data.defineCollection(schema)` helper (or document the supported
`site:patch` to `data.collections.*` as the official path).

## R8 — `media:write` via `ctx` · P2 · planned

`ctx.media.list()` exists; no write capability. Needed to generate/store OG images
and to set alt text on media.

**Ask:** `ctx.media.upload()/update()` under a `media:write` grant.

## R9 — `audit:read` on `ctx` · P2 · planned

We can write audit entries but can't read them back through `ctx` (owners read via
`GET /api/sophia/audit`). For an in-panel activity feed we'd want a read.

**Ask:** `ctx.audit.list()` under the reserved `audit:read`.

## R10 — Configurable robots.txt / llms.txt + redirects · P2 · planned

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

With R1/R2/`embed` shipped, the Suite now operates fully: **titles, description,
canonical, robots, Open Graph, Twitter, and JSON-LD = applied & served in `<head>`**;
**targeted rollback by snapshot id = live**; **internal-link suggestions via
embeddings = live**. Remaining asks (R3–R10) are conveniences and background
automation; we keep self-emit/inline workarounds for R3/R4/R5 until they land this
cycle, then switch them off (see `docs/compatibility.md`).
