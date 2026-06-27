# Sophia Stack Integration — the extension model

> File: docs/extension-integration.md · Companion: `sophia-stack-readonly-analysis.md`,
> `sophia-stack-extension-requirements.md` · Code: `extensions/sophia-stack/`

This is the **primary** way Sophia SEO Suite connects to a Sophia Stack site: it
installs as a **Sophia Stack extension** and runs in-process through the host's
permissioned `ctx` API. (For non-Stack platforms and standalone use, the abstract
`SiteConnector` with HTTP/mock transports still applies — see `architecture.md`.)

## Two integration paths, one engine

```
                       ┌─────────────────────────────┐
                       │   @sophiaxt/seo-core engine  │
                       │   (audit, plan, score, …)    │
                       └───────────────┬──────────────┘
                                       │ SiteConnector contract
                       ┌───────────────┴──────────────┐
                       ▼                               ▼
        ┌──────────────────────────┐     ┌────────────────────────────┐
        │  In-extension (PRIMARY)  │     │  Standalone (external)       │
        │  CtxTransport over ctx   │     │  HttpTransport over          │
        │  inside Sophia Stack     │     │  /api/sophia/* · or Mock     │
        └──────────────────────────┘     └────────────────────────────┘
```

The same connector + engine power both; only the transport differs. The extension
constructs `SophiaStackConnector` with a `CtxTransport(ctx)`. On Stack v1.5 the
`ctx.versions` API gives true **`supportsRollback` + `versioning: "addressable"`**;
the transport feature-detects and degrades gracefully on older hosts (though the
manifest `requires.sophiaStack ">=1.5.0"` is the real gate).

## The extension (`extensions/sophia-stack/`)

| File | Role |
| --- | --- |
| `extension.json` | Manifest: id `sophia-seo-suite`, permissions, routes, adminNav, hooks, `requires.sophiaStack >=1.0.0`. |
| `extension.js` | Entry (`activate`/`deactivate`). Registers nav/settings/routes/hooks; runs the audit; performs safe patches via `ctx.site.patch`. Self-contained ESM (installs by copy). |
| `admin/index.js` | Admin-UI entry. Documentation-only until the Stack ships panel mounting (`adminEntry` rendering is `(planned)`). |
| `scripts/pack.mjs` | Produces a clean installable copy under `dist/`. |

### Permissions requested
`site:read site:patch pages:read pages:patch media:read settings:read settings:write ai:use audit:read`

### Routes (served at `/api/extensions/sophia-seo-suite/*`)
- `GET /audit` — real audit over the live model (read-only).
- `POST /plan-title` — **preview** a title change (no write); optional AI suggestion.
- `POST /optimize-title` — **apply** a labelled title patch (auth-gated).
- `POST /optimize-meta` — set native `pages.<route>.seo.*` (description, canonical,
  robots, openGraph, twitter) — **rendered in `<head>`** (R1).
- `POST /add-schema` — append to native `seo.jsonLd[]` (rendered, script-safe).
- `GET /suggest-links` — read-only internal-link suggestions via `ctx.ai.embed`.
- `GET /versions` — enumerable named snapshots (R2).
- `POST /rollback {id}` — targeted rollback of one change (R2), auth-gated.
- `GET /panel` — the owner UI (R5), rendered by the Stack as a dashboard tab.
- `GET /health` — liveness + version + capability snapshot.

### Admin panel (R5)
`ctx.admin.registerPanel({ label: "SEO Suite", path: "panel" })` registers an
in-dashboard tab; the Stack iframes `/panel` same-origin so its `fetch`es carry the
owner session. The panel is a self-contained HTML UI that drives the routes above
(audit, metadata editor, schema, internal-links, versions/rollback). On a pre-R5
host the extension falls back to `registerNav` and the same UI is reachable at the
`/panel` route directly.

### Hooks
Listens to `page.afterSave`, `site.afterPatch`, `media.afterUpload`; self-emits
`seo.audit.requested` (the core does not fire it — see the Stack's `hooks.md`).

## How the safe workflow maps onto `ctx`

| Suite lifecycle step | Extension mechanism |
| --- | --- |
| Analyze (read-only) | `ctx.site.read()` → audit engine. |
| Preview | `POST /plan-title` returns before/after; nothing written. |
| Approve | mutating routes require `helpers.isAdmin`/`hasToken`; actor recorded. |
| Apply | `ctx.site.patch(ops, label)` → validate-before-commit + named snapshot + rollback + audit (automatic). |
| Version / rollback | `ctx.versions.list()` enumerates named snapshots; `ctx.versions.rollbackTo(id)` reverts one change (R2, shipped). |
| Audit log | `ctx.audit.log(action, details)`; owner reads via `GET /api/sophia/audit`. |

## Install

**One-click git install (Sophia Stack v1.5+, live):** the Stack fetches the public
repo's `extensions/sophia-stack` directory (GitHub tarball, no auth), validates the
manifest + `requires.sophiaStack`, and installs non-destructively. Dashboard →
**Extensions → "Add Sophia SEO Suite"**, or:

```bash
POST /api/sophia/extensions/install
{ "repo": "Chorozion/SophiaXT-SEO-Suite", "subdir": "extensions/sophia-stack" }
```

The entry is self-contained ESM (no imports) so the Stack `import()`s it directly —
no build. **Manual/offline** copy-install still works (see the extension README).
Distribution detail: [`release-channel.md`](./release-channel.md).

## Build posture (from the contract)

1. Reads via `ctx.site.read` / `ctx.pages.read` / `ctx.media.list`.
2. Writes **only** via `ctx.site.patch` — never the model/files directly.
3. AI via `ctx.ai.generate()` only (no `stream`/`embed`).
4. Trigger work from the three fired hooks + own routes — do not depend on job
   execution or unfired hooks.
5. Ship `adminNav` + routes now; keep `adminEntry` ready for panel mounting.
6. Persist config via `ctx.settings.*`.

When the Stack promotes a `(planned)` capability, see
[`sophia-stack-extension-requirements.md`](./sophia-stack-extension-requirements.md)
for how the Suite lights it up.
