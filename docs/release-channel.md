# Install & distribution

> File: docs/release-channel.md · Aligns with Sophia Stack v1.5 WS4 (one-click install).

## Primary: one-click git install (LIVE)

Sophia Stack v1.5 installs extensions **straight from a public GitHub repo** — no
release channel, no zip required. The installer:

1. downloads the repo tarball (`codeload.github.com/<owner>/<repo>/tar.gz/refs/heads/<branch>`, no auth),
2. finds `extension.json` at the given subdir,
3. validates the manifest + `requires.sophiaStack`,
4. installs non-destructively (backup → install → auto-rollback on any failure),
5. surfaces the admin nav; owner can enable / disable / uninstall.

**This repo is configured for it:**

| Field | Value |
| --- | --- |
| repo | `Chorozion/SophiaXT-SEO-Suite` (**public**, source-available) |
| branch | `main` |
| subdir | `extensions/sophia-stack` |
| entry | `extension.js` — self-contained ESM, `import()`-able, no build |
| requires | `sophiaStack ">=1.5.0"` |

The Stack's **"Add Sophia SEO Suite"** button points here. Manual test (owner
session):

```bash
POST /api/sophia/extensions/install
{ "repo": "Chorozion/SophiaXT-SEO-Suite", "subdir": "extensions/sophia-stack" }
```

The installer also accepts `owner/repo`, `owner/repo#branch`, or a
`/tree/<branch>/<subdir>` GitHub URL.

### Why public + proprietary is consistent
The extension runs inside each owner's Stack deployment, so its source must be
fetchable to run. The repo is **source-available** (public) for that and for
transparency; the `LICENSE` remains proprietary (no redistribution/reuse). See the
README license note.

## Non-destructive install / update / uninstall

- **Install:** owner logged-in → validate `requires` + manifest → fetch + install
  into `.sophia-data/extensions/sophia-seo-suite/` → enable. No site data touched.
- **Update:** re-fetch; our settings live in `tokens.extSettings` and **carry
  forward automatically**. Settings shape changes are applied as a
  **forward-idempotent** transform in `activate()` (`migrateSettings`, gated by
  `settingsVersion`) — never a destructive rewrite.
- **Uninstall:** removes only the extension dir. **No data loss:** SEO metadata and
  JSON-LD we wrote live in the Site Model (`pages.<route>.seo.*`) and remain the
  owner's. `deactivate()` deletes nothing.

## Secondary (optional): packaged zip for offline bundling

For the Stack's WS5 "ship a pinned SEO-Suite in the zip / offline" case, a
versioned artifact can be produced:

```bash
pnpm --filter @sophiaxt/seo-ext-sophia-stack release   # → dist zip + sha256
```

This refreshes `release/sophia-seo-suite/channel.json` (id, version, `requires`,
sha256) and builds `dist/sophia-seo-suite-<version>.zip`. Attach it to a GitHub
Release tagged `seo-suite-v<version>` if an offline/pinned bundle is wanted. Not
required for one-click install.
