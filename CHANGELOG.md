# Changelog

All notable changes to Sophia SEO Suite are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); the project uses
[Semantic Versioning](https://semver.org/) once it reaches `1.0.0`.

## [Unreleased]

### v1.5 alignment — extension `0.2.0` (targets Sophia Stack v1.5 "Stable")
- **Build on shipped Stack surfaces:** native SEO `<head>` metadata (R1),
  enumerable versions + targeted rollback (R2), `ctx.ai.embed`.
- **Extension:** `requires.sophiaStack ">=1.5.0"`; labelled patches; `/optimize-meta`
  now sets native `pages.<route>.seo.*` (rendered in `<head>`); `/add-schema` appends
  to native `seo.jsonLd[]`; new `/suggest-links` (embed-based, read-only), `/versions`,
  and `/rollback {id}` routes; forward-idempotent settings migration (`migrateSettings`);
  non-destructive `deactivate`.
- **Connector/transports:** `CtxTransport` wires `ctx.versions.list/rollbackTo` +
  labelled patch; HTTP/Mock transports gain named snapshots + targeted rollback;
  connector `listVersions`/`rollback(id)` are real; `planSchemaAddition` uses native
  `seo.jsonLd[]`; capabilities → `versioning: "addressable"`.
- **One-click install (WS4):** release-channel descriptor
  (`release/sophia-seo-suite/channel.json`) + release script (zip + sha256);
  `docs/release-channel.md` proposes the fetch protocol for interlock.
- **Sync collateral:** `docs/compatibility.md` (matrix), `docs/v1.5-sync-checklist.md`
  (SEO half), `docs/screenshots/` placeholders.

### Added
- **Foundation scaffold**: pnpm monorepo (`apps/`, `packages/`, `extensions/`),
  Docker Compose (Postgres + Redis), `.env.example`, strict TypeScript config.
- **`packages/shared`**: tier + module registry (capability gating as data),
  findings/roles/result types, validated env loader with secret redaction.
- **`packages/connectors/core`**: the `SiteConnector` contract (read → plan →
  apply → rollback), capability flags, approval safety gate, stub base.
- **`packages/connectors/sophia-stack`**: Sophia Stack connector mapping SEO
  intent → patch ops, with `Mock`, `Http`, and **`Ctx`** transports.
- **`packages/connectors/{wordpress,wix,webflow,shopify,webhook}`**: clean stubs.
- **`packages/core`**: SEO engine — real audit skeleton + score, meta-editor,
  module registry, placeholders for crawler/geo/schema/llms-txt/content/reports/
  permissions.
- **`packages/db`**: Prisma schema draft for the safe-editing lifecycle + RBAC.
- **`packages/workers`**: BullMQ queue + audit processor skeleton.
- **`apps/dashboard`**: Next.js App Router shell running a live mock audit.
- **`extensions/sophia-stack`**: installable **Sophia Stack extension** (manifest
  + `ctx`-wired entry: audit, plan/preview, safe `optimize-title`/`optimize-meta`/
  `add-schema`, hooks, settings, admin nav) + pack script.
- **Docs**: architecture, modules, tiers, owner-safe-editing, security, the
  read-only Stack analysis, the extension-integration guide, and the prioritized
  Stack requests.
- **Governance**: proprietary `LICENSE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`,
  `ROADMAP`, `.github/` (CI + issue/PR templates).

### Notes
- Integration model updated to the **Sophia Stack Extension API v1**: the Suite
  installs as an extension and uses `ctx`; the HTTP/mock connector remains for
  standalone and future non-Stack platforms.
