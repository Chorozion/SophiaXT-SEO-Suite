# Release channel — one-click install (proposal for interlock)

> File: docs/release-channel.md · For: Sophia Stack WS4 (one-click installer)
> Status: PROPOSED — pending the Stack session's confirmation of the fetch format.

The Stack's v1.5 "Add Sophia SEO Suite" button (WS4) fetches a published extension
package from a release channel, verifies `requires.sophiaStack` + integrity,
installs into `.sophia-data/extensions/sophia-seo-suite/`, and enables it —
**non-destructively**. This doc proposes the channel format the Suite publishes so
the two can interlock. **If the Stack already pins a format, we conform to it —
this is a starting point, not a mandate.**

## Channel descriptor

Published at a stable, fetchable URL. In-repo copy:
`release/sophia-seo-suite/channel.json` (raw-fetchable from the repo at a ref).

```jsonc
{
  "id": "sophia-seo-suite",
  "name": "Sophia SEO Suite",
  "publisher": "SophiaXT",
  "latest": "0.2.0",
  "installDir": "sophia-seo-suite",          // → .sophia-data/extensions/<installDir>/
  "versions": [
    {
      "version": "0.2.0",
      "requires": { "sophiaStack": ">=1.5.0" }, // installer enforces this
      "source": {                                // FETCH MODE A: from the repo at a ref
        "repo": "Chorozion/SophiaXT-SEO-Suite",
        "ref": "main",
        "path": "extensions/sophia-stack",
        "files": ["extension.json", "extension.js", "admin/index.js", "README.md"]
      },
      "artifact": {                              // FETCH MODE B: a release zip
        "zip": "https://github.com/.../releases/download/seo-suite-v0.2.0/sophia-seo-suite-0.2.0.zip",
        "sha256": "…",                           // integrity; verify before install
        "bytes": 12345
      },
      "changelog": "…"
    }
  ]
}
```

### Two fetch modes (installer picks one)
- **A — repo source (git-verifiable):** fetch the listed files from `repo@ref:path`.
  Integrity = the pinned ref/commit. No zip needed. Simplest for trusted repos.
- **B — release zip (checksum-verifiable):** download `artifact.zip`, verify
  `sha256`, unpack into `installDir`. The zip's contents are the extension files at
  its root (`extension.json` at the top).

The zip + checksum are produced by `pnpm --filter @sophiaxt/seo-ext-sophia-stack release`
(see `extensions/sophia-stack/scripts/release.mjs`), then attached to a GitHub
Release tagged `seo-suite-v<version>`.

## Install / update / uninstall — non-destructive contract

Aligns with the Stack's `docs/operations/updates.md` + the v1.5 non-destructive spec:

- **Install:** owner logged-in → verify `requires` + integrity → write files into
  `installDir` → enable → surface adminNav. No site data touched.
- **Update:** same pipeline; our settings live in `tokens.extSettings` and **carry
  forward automatically**. Any settings shape change is applied as a
  **forward-idempotent** transform in our `activate()` (`migrateSettings`, gated by
  `settingsVersion`) — never a destructive rewrite.
- **Uninstall:** remove the extension folder + disable. **No data loss:** SEO
  metadata and JSON-LD we wrote live in the Site Model (`pages.<route>.seo.*`) and
  remain the owner's — uninstalling the Suite does not strip their SEO work. Our
  `deactivate()` deletes nothing.

## Open questions for the Stack session (interlock)
1. Which fetch mode does the WS4 installer implement first — repo source (A) or
   release zip (B)? We support both; tell us which to prioritize.
2. Exact channel URL/shape the installer expects (so `release/.../channel.json`
   matches). Field names above are a proposal.
3. Is a signature (beyond sha256) required for v1.5, or is checksum + pinned ref
   sufficient?
