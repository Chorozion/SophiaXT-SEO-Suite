# Screenshots (SEO half of the joint v1.5 demo — WS7)

Placeholders for the SEO Suite's contribution to the joint "See it in action"
section. These require a **live Sophia Stack deployment** with the Suite installed
(they can't be captured from the in-memory mock), so they're pending a live test.

Planned stills (+ a short GIF):

1. `audit-run.png` — `GET /api/extensions/sophia-seo-suite/audit` returning real
   findings + score for a site.
2. `apply-fix.png` — applying a title/meta/JSON-LD fix safely (preview → approve →
   `ctx.site.patch`), with the change reflected in the rendered `<head>`.
3. `versions-rollback.png` — the named version list + a targeted rollback.

Capture once the extension is installed in a running v1.5 Stack (see
`docs/release-channel.md` for install). Then add a "See it in action" section to
the repo README referencing these.
