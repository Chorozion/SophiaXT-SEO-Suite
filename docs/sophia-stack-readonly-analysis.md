# Sophia Stack — Read-Only Analysis

> File: docs/sophia-stack-readonly-analysis.md
> Source: the **Sophia Stack** repo (`Chorozion/Sophia-Stack`), inspected
> **read-only**, never modified. Paths below are relative to that repo.
> Date: 2026-06-27 · Status: reference for connector + extension design
> Predecessor: — · Successor: `docs/sophia-stack-extension-requirements.md`

This is a factual map of how Sophia Stack works **today**, written so the Sophia
SEO Suite connector can target it precisely. We did not change any Sophia Stack
file. Where this doc says "missing," it means "not present today" — those gaps
are turned into requirements in the companion
[`sophia-stack-extension-requirements.md`](./sophia-stack-extension-requirements.md).

---

## 1. What Sophia Stack is

An AI-optimized, self-hosted full-stack site builder. An agent builds/edits/ships
real sites at minimal token cost via **REST + MCP + OpenAPI**. Tech: Node ≥18,
**pure ESM** (`.mjs`), Express 5, React 18 SSR + hydration, esbuild. **No
database and no ORM** — all state is JSON files on disk. The whole server API is
essentially one file: `src/server.mjs` (~600 lines).

## 2. How a site is stored — the Site Model

State lives in a `.sophia-data/` directory created at first run (must persist
across restarts/deploys):

| File | Purpose |
| --- | --- |
| `model.json` | The canonical **Site Model** (pages, blocks, data collections, functions, connections). |
| `custom.css` | User-editable CSS layer. |
| `tokens.json` | Admin creds (scrypt-hashed), API tokens, sessions, LLM config. Mode `0600`. |
| `history.json` | Up to **30** version snapshots `{ model, css }` for rollback. |
| `collections/*.json` | Data records (one file per declared collection). |
| `media/` | Uploaded files + `_manifest.json`. |

**Site Model shape (`model.json`):**

```jsonc
{
  "site": "Acme Inc",
  "style": "dark-tech",          // one of 7 theme presets
  "brief": "free-text AI context",
  "connections": { "feed": { "type": "rest", "url": "...", "path": "events", "limit": 5 } },
  "pages": {
    "/":      { "title": "Home",  "blocks": [ /* ordered blocks */ ] },
    "/about": { "title": "About", "blocks": [] }
  },
  "data":      { "collections": { /* ... */ } },
  "functions": { "subscribe": { "code": "…sandboxed JS…" } }
}
```

Validation: `src/validate.mjs` requires `pages` (object); each page has a `blocks`
array; each block has a unique `id` + known `type`.

## 3. Pages

- Pages are **keyed by route path** (`/`, `/about`, …) inside `model.pages`.
- **No page files** — a page is `{ title, blocks[] }` in the single model JSON.
- `title` becomes the `<title>` tag.
- Add a page: `{ op:"mset", path:"pages./newpage", value:{ title:"…", blocks:[] } }`.
- Change a title: `{ op:"mset", path:"pages./.title", value:"New Title" }`.

## 4. Blocks (the component system)

12 typed blocks, defined in `catalog.json` (props) + `src/blocks.jsx` (React):
`nav`, `hero`, `features`, `stats`, `logos`, `steps`, `pricing`, `quote`,
`html`, `feed`, `cta`, `footer`.

Every block: `{ id, type, fx?: string[], ...typeProps }`. `id` is **stable and
unique per page** — it's the patch target. The `html` block (`{ html, css?, js? }`)
is the **escape hatch** for arbitrary markup — this is how the SEO connector can
inject a JSON-LD `<script>` without a new block type.

Blocks are readable via `GET /api/sophia/model`; available types via
`GET /api/sophia/catalog`.

## 5. REST API (base `/api/sophia/*`)

Read (mostly public):

| Method · Path | Purpose |
| --- | --- |
| `GET /api/sophia/ping` | Health + `{ canWrite }` token check. |
| `GET /api/sophia/catalog` | Block/style/effect/patch-op catalog. **Call first.** |
| `GET /api/sophia/model` | Entire Site Model. |
| `GET /api/sophia/data` | Live resolved connection data. |
| `GET /api/sophia/css` | Current custom CSS. |
| `GET /api/sophia/versions` | Snapshot count (Bearer). |

Write (Bearer token, editor/admin):

| Method · Path | Purpose |
| --- | --- |
| `POST /api/sophia/patch` | Apply ops; **validate-before-commit**, 422 on invalid. |
| `PUT  /api/sophia/css` | Replace sanitized CSS. |
| `POST /api/sophia/rollback` | Undo last edit (pop one snapshot). |
| `*    /api/sophia/tokens` | Admin token mint/list/revoke. |

Data CRUD: `/api/data/:collection[/:id]` (policy-gated). Functions:
`/api/fn/:name` (sandboxed, 1.5s). Media: `POST/GET/DELETE /api/media`.
Discovery: `GET /sitemap.xml`, `/robots.txt`, `/llms.txt`, `/openapi.json`,
`/skill.md`. Realtime: `GET /live` (SSE patch/CSS stream). MCP: `GET/POST /mcp`.

Source: `src/server.mjs:264-600`.

## 6. Patch engine (the safe-edit primitive)

Six ops (from `catalog.json`):

```
{op:'set',   id, path, value}      // set a block prop by id (dot path)
{op:'add',   route, value, index?} // insert a block (value must have id)
{op:'remove',id}                   // delete a block by id
{op:'move',  id, index}            // reorder within its page
{op:'mset',  path, value}          // set ANY model path (data/style/page titles)
{op:'mdel',  path}                 // delete a model path
```

Apply semantics (`src/server.mjs:227-233`, `src/patch.mjs:44-100`): ops apply to a
**clone**, `validateModel()` runs, invalid → `422` and the live model is
untouched, valid → snapshot previous state → save → broadcast over SSE. This is
exactly the non-destructive, addressable, reversible primitive the SEO connector
needs.

## 7. Versioning & rollback

`store.snapshot()` saves `{ model, css }` before each successful patch (bounded to
30). `POST /api/sophia/rollback` pops the last snapshot, restores it, and
broadcasts; returns `{ ok, restored, remaining }`. Source: `src/store.mjs:28-40`.

## 8. MCP

Five tools, identical over remote `/mcp` (JSON-RPC 2.0 over HTTP, Bearer) and the
stdio wrapper `mcp/sophia-mcp.mjs` (env `SOPHIA_URL`, `SOPHIA_TOKEN`):
`sophia_catalog`, `sophia_read_model`, `sophia_patch`, `sophia_set_css`,
`sophia_rollback`. The connector can speak either REST or MCP — REST is simpler
for a server-to-server connector.

## 9. Deployer

`build` (esbuild → `dist/`) → `package` (self-contained `package/` folder, no
`node_modules`) → run `node app.js` (reads `process.env.PORT`, creates/uses
`.sophia-data/`). Targets: Hostinger (Passenger), Railway, Render, VPS, Docker.
Not Vercel/Lambda (needs persistent FS). CLI: `bin/sophia.mjs`
(`init`/`package`/`deploy`/`backup`/`restore`). The ARCHITECTURE describes a
hardened non-destructive deploy flow (backup → atomic swap → data/`.env`
preservation → health-verify → rollback); model-level rollback + persisted
`.sophia-data` are the implemented pieces today.

## 10. Auth & secrets

- **Env** holds AI provider keys only (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `GEMINI_API_KEY`, local-model base URLs, …). `PORT` is host-set. `.env` is not
  committed.
- **`tokens.json`** holds scrypt-hashed admin password + recovery code, API
  tokens (`mykey-*` editor / `mykey-ADMIN*` admin), sessions, and the LLM config.
  File mode `0600`; passwords/recovery never returned to client.
- Auth middleware: `src/server.mjs:191-219` (Bearer + session, IP brute-force
  lockout: 8 fails → 15 min).

**Connector implication:** the SEO Suite stores a per-site **editor Bearer token**
(`mykey-*`), encrypted at rest, and sends it as `Authorization: Bearer …` on
patch/rollback calls. Admin scope is only needed for token management, which the
connector should avoid.

## 11. SEO surfaces — present vs. missing

**Present today:**

- `GET /sitemap.xml` — auto-generated from `model.pages` keys (`server.mjs:284`).
- `GET /robots.txt` — static, points to the sitemap (`server.mjs:290`).
- `GET /llms.txt` — site name + page list (`server.mjs:303`).
- Per-page `<title>` from `model.pages[route].title`.
- Hardcoded `viewport` + `charset` meta in the HTML shell.

**Missing today (the SEO Suite's opportunity):**

- Per-page/site **meta description**, keywords, canonical.
- **Open Graph** + **Twitter Card** tags.
- **JSON-LD / schema.org** structured data.
- Configurable `robots.txt` / `llms.txt` content (currently fixed).
- Image **alt-text** enforcement, redirects, preload hints.

**Where it would attach:** head generation is `pageHead()` in `src/styles.mjs:98`,
and the shell title is set at `src/server.mjs:250-258`. A natural model extension
is an optional `model.seo` block + per-page `pages[route].seo` (see the
extension-requirements doc).

## 12. How the connector should interact (summary)

1. `GET /api/sophia/catalog` → discover capabilities.
2. `GET /api/sophia/model` → read structure (pages, blocks, titles).
3. Compute SEO findings + changes in `packages/core` (pure logic).
4. Express each change as **patch ops** (`mset` for titles/meta/`seo`; `add` of an
   `html` block for JSON-LD) — staged as a ChangeSet, **not sent** until approved.
5. On approval: `POST /api/sophia/patch` with the ops (validate-before-commit
   protects the site).
6. Rollback via `POST /api/sophia/rollback`; list depth via `GET /versions`.
7. Today, the connector reads/writes only existing, supported model paths; richer
   SEO fields (`model.seo`, per-page `seo`, configurable robots/llms) depend on the
   extension requirements landing in Sophia Stack. Until then, the connector uses
   page titles + `html` blocks (for JSON-LD/meta-bearing markup) as the supported
   path, and degrades the rest to "report-only."

## 13. UPDATE — Sophia Stack shipped an Extension API v1

Since this analysis was first written, the Sophia Stack session **shipped an
extension/plugin system v1** (`Chorozion/Sophia-Stack` @ `main`). This changes the
**primary** integration: rather than only reaching the site over HTTP
(`/api/sophia/*`), the Suite installs as an **in-process extension** and talks to
the host through a permissioned `ctx` API. The patch/rollback safety described
above is exactly what `ctx.site.patch()` runs automatically.

Available **today** via `ctx` (per the Stack's
`docs/extensions/sophia-seo-suite-contract.md`): `site.read/patch/setCss`,
`pages.read/patch`, `media.list`, `data.list/get/create/update/remove`,
`settings.*`, `ai.generate` (provider-agnostic), `audit.log`,
`routes.register` (served at `/api/extensions/<id>/*`), `admin.registerNav`,
`hooks.on/emit`. Fired hooks: `page.afterSave`, `site.afterPatch`,
`media.afterUpload`.

**(planned)** and therefore not relied on: admin-panel rendering (`adminEntry`),
background job execution, `ai.stream`/`ai.embed`, `media:write`, data-model
registration, native SEO `<head>` metadata, core-fired `seo.audit.requested` /
publish hooks, install/uninstall CLI.

→ The Suite's real integration lives at `extensions/sophia-stack/` and is
described in [`extension-integration.md`](./extension-integration.md). The
abstract `SiteConnector` (HTTP/mock transports) remains valid for **standalone**
mode and for future non-Stack platforms; the `CtxTransport` adapts the same
connector to the in-extension `ctx`.

---

### Related files

| File | Relation |
| --- | --- |
| `docs/extension-integration.md` | The extension architecture (manifest, `ctx`, install). |
| `docs/sophia-stack-extension-requirements.md` | What Sophia Stack still owes the Suite. |
| `extensions/sophia-stack/` | The installable Stack extension (real integration). |
| `packages/connectors/sophia-stack/` | The connector + transports (ctx/http/mock). |
| `packages/connectors/core/` | The platform-agnostic interface. |
| `ARCHITECTURE.md` | How it all fits together. |
