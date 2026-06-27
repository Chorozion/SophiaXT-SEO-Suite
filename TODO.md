# TODO — Sophia SEO Suite

Status of the **foundation** build and what comes next. Checked = exists in repo
(skeleton/stub quality unless noted). Unchecked = not started.

## ✅ First pass (foundation) — done

- [x] Read-only analysis of Sophia Stack → `docs/sophia-stack-readonly-analysis.md`
- [x] Extension requirements for Sophia Stack → `docs/sophia-stack-extension-requirements.md`
- [x] Core docs: `README`, `CLAUDE.md`, `ARCHITECTURE.md`, `SECURITY.md`,
      `docs/{architecture,modules,tiers,security,owner-safe-editing}.md`
- [x] Monorepo skeleton: pnpm workspace, root `package.json`, `tsconfig.base.json`
- [x] Local infra: `docker-compose.yml` (Postgres + Redis), `.env.example`
- [x] `packages/shared`: tiers, modules registry, shared types, result types
- [x] `packages/db`: Prisma schema **draft** (sites/drafts/audit/versions/jobs/RBAC)
- [x] `packages/connectors/core`: `SiteConnector` interface + capabilities + types
- [x] `packages/connectors/sophia-stack`: mock connector (in-memory model)
- [x] `packages/connectors/{wordpress,wix,webflow,shopify,webhook}`: clean stubs
- [x] `packages/core`: module registry + **audit engine skeleton** + module stubs
- [x] `packages/workers`: queue + processor skeletons
- [x] `apps/dashboard`: Next.js App Router shell (sites list, draft/approval shell)
- [x] **`extensions/sophia-stack`**: real installable Sophia Stack extension —
      manifest + `ctx`-wired entry (audit, plan/preview, safe `optimize-title`,
      `optimize-meta`, `add-schema`), admin entry, pack script
- [x] `CtxTransport` — adapts the Sophia Stack connector to the in-extension `ctx`
- [x] Git governance (proprietary): LICENSE, CONTRIBUTING, CODE_OF_CONDUCT,
      CHANGELOG, ROADMAP, `.github/` (CI, issue/PR templates)

## ⏭️ Next (still foundation-adjacent, not yet built)

- [ ] Unify the extension entry with `@sophiaxt/seo-core` via an esbuild bundle
      (today `extensions/sophia-stack/extension.js` mirrors `audit-core` in JS to
      stay buildless/installable-by-copy)
- [ ] Live-test the extension inside a Sophia Stack deployment (enable + run /audit)
- [ ] Implement real crawler (Playwright + Cheerio) behind politeness controls
- [ ] Flesh out `audit-core` checks (title/meta/headings/links/schema) for real
- [ ] Real Sophia Stack HTTP transport (swap mock store for `fetch` against base URL)
- [ ] AES-256-GCM connector-credential vault + logging redaction utility
- [ ] RBAC middleware + session auth in dashboard
- [ ] Draft → preview → approve → apply flow wired end-to-end (mock connector)
- [ ] BullMQ wired to Redis with a real `audit` job
- [ ] Prisma migration + seed; replace draft schema notes with reviewed schema
- [ ] Zod schemas for every API boundary + connector response
- [ ] Unit tests for connector mapping + module analyze()

## 🔮 Later (explicitly out of scope for now — do NOT start)

- [ ] Tier 2: content planner, AI article/service/landing generators, FAQ, queue
- [ ] Search Console connection
- [ ] Tier 3: multi-site dashboard, client mgmt, white-label reports
- [ ] WordPress / Wix / Webflow / Shopify connectors (currently stubs)
- [ ] AI-visibility tracking, backlink-opportunity tracking
- [ ] Reddit / social surfaces

> Guardrail: per the brief, we stop at the foundation. Article generation, Search
> Console, backlinks, Reddit, and AI-visibility come in later, separately-scoped
> passes.

## 🧩 Depends on Sophia Stack (tracked as requirements, not our code)

The connection mechanism is solved (Stack Extension API v1). These unlock native
(vs. stored-but-not-served) SEO. See
`docs/sophia-stack-extension-requirements.md` + the cross-session coordination
channel:

- [ ] R1 — first-class SEO metadata rendered in `<head>` (`model.seo` / page `seo`) (P0)
- [ ] R2 — enumerable versions + targeted rollback via `ctx` (P0)
- [ ] R3–R10 — core-fired SEO/publish hooks, job execution, admin-panel mount,
      `ai.embed`, data-model registration, `media:write`, `audit:read`,
      configurable robots/llms + redirects
