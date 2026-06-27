# Compatibility matrix — Sophia SEO Suite ⇄ Sophia Stack

> File: docs/compatibility.md · Part of the v1.5 joint cut (WS6).
> The Stack's one-click installer enforces the extension manifest's
> `requires.sophiaStack`. This matrix is the human-readable source of truth.

| SEO Suite | Requires Sophia Stack | Builds on | Status |
| --- | --- | --- | --- |
| `0.2.0` | `>=1.5.0` | R1 SEO `<head>` render, R2 versions + targeted rollback, `ctx.ai.embed`, hook bus, scoped perms | current — v1.5 alignment |
| `0.1.0` | `>=1.0.0` | Extension API v1 (`ctx.site.read/patch`, settings, routes, hooks, `ai.generate`) | superseded |

## Why `0.2.0` requires `>=1.5.0`

`0.2.0` uses surfaces that only exist in Stack v1.5:
- **Native SEO `<head>` rendering (R1):** `pages.<route>.seo.*` / `model.seo.*`
  emitted into `<head>` (description/canonical/robots/openGraph/twitter/jsonLd).
- **Enumerable versions + targeted rollback (R2):** `ctx.versions.list()`,
  `ctx.site.patch(ops, label)`, `ctx.versions.rollbackTo(id)`.
- **`ctx.ai.embed()`** for internal-link suggestions.

The extension feature-detects (`ctx.versions`, `ctx.ai.embed`) and degrades
gracefully, but `requires: ">=1.5.0"` is the real gate — the installer refuses to
install it on an older deployment.

## Pending Stack capabilities (consumed when they land this cycle)

| Capability | We switch on |
| --- | --- |
| R3 — core fires `seo.audit.requested` + publish/pre-save hooks | drop the self-emit shim; trigger audits/pre-publish checks natively |
| R4 — `ctx.jobs` execution | move re-audits to background jobs (off inline) |
| R5 — `adminEntry` panel mount | move the owner UI from routes into the dashboard panel |

When the Stack promotes any of these (watch the coordination doc), bump a minor
version and update this matrix.
