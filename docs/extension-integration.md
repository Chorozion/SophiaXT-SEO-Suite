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
constructs `SophiaStackConnector` with a `CtxTransport(ctx)` and
`{ supportsRollback: false, versioning: "none" }` (the `ctx` API exposes no
rollback trigger — safety still runs automatically inside the Stack on each patch).

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
- `POST /optimize-title` — **apply** a title (auth-gated) via `ctx.site.patch`.
- `POST /optimize-meta` — set a page meta description (stored on `model.seo`).
- `POST /add-schema` — additive JSON-LD via an `html` block.
- `GET /health` — liveness + version.

### Hooks
Listens to `page.afterSave`, `site.afterPatch`, `media.afterUpload`; self-emits
`seo.audit.requested` (the core does not fire it — see the Stack's `hooks.md`).

## How the safe workflow maps onto `ctx`

| Suite lifecycle step | Extension mechanism |
| --- | --- |
| Analyze (read-only) | `ctx.site.read()` → audit engine. |
| Preview | `POST /plan-title` returns before/after; nothing written. |
| Approve | mutating routes require `helpers.isAdmin`/`hasToken`; actor recorded. |
| Apply | `ctx.site.patch(ops)` → validate-before-commit + snapshot + rollback + audit (automatic). |
| Version / rollback | snapshots happen inside the Stack; `ctx` can't enumerate or trigger them yet (see requirements R4). |
| Audit log | `ctx.audit.log(action, details)`; owner reads via `GET /api/sophia/audit`. |

## Install (today)

The install CLI is `(planned)`; install by copy:

```bash
# build a clean copy, then drop it into a deployment
pnpm --filter @sophiaxt/seo-ext-sophia-stack pack:ext
cp -r extensions/sophia-stack/dist/sophia-seo-suite \
      <deployment>/.sophia-data/extensions/sophia-seo-suite
# restart the Stack, then enable as owner:
#   POST /api/sophia/extensions { "id": "sophia-seo-suite", "enabled": true }
```

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
