# Sophia SEO Suite — Sophia Stack extension

The installable extension that connects **Sophia SEO Suite** to a **Sophia Stack**
deployment. It runs in-process via the Stack's extension `ctx` API and provides
real SEO audits + owner-safe metadata/schema tools.

This is the **real integration** (the contract stub lives in the Sophia Stack repo
at `examples/extensions/sophia-seo-suite-stub` and only proves the shape).

## Install (today: copy-folder)

The Stack's install CLI is `(planned)`, so install by copy:

```bash
# 1. Copy this folder into a Sophia Stack deployment:
cp -r extensions/sophia-stack  <deployment>/.sophia-data/extensions/sophia-seo-suite
#    …or run the Stack with SOPHIA_EXTENSIONS_DIR pointing at a dir containing it,
#    or createServer({ extensionsDir }).

# 2. Restart the Stack server, then enable it as the owner:
#    POST /api/sophia/extensions  { "id": "sophia-seo-suite", "enabled": true }
```

It loads if the deployment is Sophia Stack `>= 1.0.0` (manifest `requires`).

## What it does

| Surface | Detail |
| --- | --- |
| **Admin nav** | "SEO Suite" item (`/admin/extensions/seo`). |
| **Settings** | `defaultTitleSuffix`, `targetKeywords`, `autoAuditOnChange`, `tier`. |
| **`GET /audit`** | Real audit over the live Site Model (titles, descriptions, H1, JSON-LD, site description) + score. Read-only. |
| **`POST /plan-title`** | Preview a title change (optionally AI-suggested). Applies nothing. |
| **`POST /optimize-title`** | Apply a title via `ctx.site.patch` (validate-before-commit + rollback + audit). Auth required. |
| **`POST /optimize-meta`** | Set a page meta description (stored on `model.seo`). Auth required. |
| **`POST /add-schema`** | Add JSON-LD additively via an `html` block. Auth required. |
| **Hooks** | `page.afterSave` / `site.afterPatch` / `media.afterUpload` → self-emit `seo.audit.requested`. |

All routes are served at `/api/extensions/sophia-seo-suite/*`.

## Safety contract

- **No direct model/file writes** — every edit goes through `ctx.site.patch`,
  which runs validate-before-commit + snapshot + rollback + audit automatically.
- **Auth-gated writes** — mutating routes require `isAdmin` or a token; the actor
  is recorded in the audit log.
- **Preview before apply** — `/plan-title` is the preview; `/optimize-*` is the
  apply.
- **Additive schema** — JSON-LD is added as a new block; existing content is never
  overwritten. `</script>` breakout is escaped.

## Permissions requested

`site:read site:patch pages:read pages:patch media:read settings:read settings:write ai:use audit:read`

## Relationship to the rest of the repo

This entry is self-contained ESM so it installs by copy with no build. The richer
roadmap engine (crawler, GEO, content, reports) lives in the TypeScript
`packages/core`; the audit logic here mirrors `packages/core/src/audit`. Unifying
them via an esbuild bundle of `@sophiaxt/seo-core` is tracked in
[`../../TODO.md`](../../TODO.md).
