# @sophiaxt/seo-dashboard

The Next.js (App Router) owner/agency dashboard for Sophia SEO Suite.

## Foundation state

This is a **shell**. It demonstrates the real data path with no database and no
live site:

- `app/lib/demo-site.ts` spins up the **mock Sophia Stack connector** and runs the
  **real audit engine** (`@sophiaxt/seo-core`).
- `app/page.tsx` renders the audit score, findings, and tier-gated modules.
- `app/safe-workflow/page.tsx` explains the draft → approve → apply → rollback
  lifecycle.

Nothing here mutates a site — the dashboard only reads in this stage. The
approval/apply UI (forms → server actions → `connector.applyChangeSet`) is the
next step (see `../../TODO.md`).

## Run

```bash
pnpm install          # from repo root
pnpm dev              # → http://localhost:3000
```

> The audit you see is computed live from the in-memory sample model in
> `@sophiaxt/seo-connector-sophia-stack` (`SAMPLE_MODEL`).
