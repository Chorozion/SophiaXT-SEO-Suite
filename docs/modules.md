# Modules

> File: docs/modules.md · Companion: `docs/tiers.md`
> Code: `packages/core/src/*` + registry in `packages/shared/src/modules.ts`

A **module** is a unit of SEO capability. Modules are pure where possible: given
site data (fetched by a connector) they produce **findings** and **ChangeSets**.
They never open a socket to a site themselves — all site I/O goes through the
connector. This keeps modules testable and keeps the safety contract in one place.

## Anatomy of a module

```ts
interface SeoModule {
  id: ModuleId;                 // stable slug, e.g. "audit-core"
  tier: Tier;                   // minimum tier (from shared registry)
  title: string;
  /** Analyze: read-only, returns findings. */
  analyze(ctx: ModuleContext): Promise<Finding[]>;
  /** Plan: turn findings/intent into a ChangeSet (does NOT apply). */
  plan?(ctx: ModuleContext, input: unknown): Promise<ChangeSet>;
}
```

`ModuleContext` carries a **read-only** view of the site (via the connector) plus
config. `plan()` returns a `ChangeSet` — a described, previewable edit — that the
connector only applies after approval.

## Tier 1 modules

| id | Title | Output |
| --- | --- | --- |
| `audit-core` | Site SEO audit | Findings across title/meta/headings/links/schema. |
| `meta-editor` | Page title / meta editor | ChangeSet of title + description edits. |
| `alt-text-checker` | Image alt-text checker | Findings: images missing/weak alt. |
| `sitemap-generator` | Sitemap generator | Proposed `sitemap.xml`. |
| `robots-helper` | robots.txt helper | Proposed `robots.txt` + validation. |
| `llms-txt-generator` | llms.txt generator | Proposed `llms.txt`. |
| `schema-basic` | Basic schema generator | Org/WebSite/LocalBusiness JSON-LD. |
| `broken-link-checker` | Broken-link checker | Findings: 4xx/5xx + dead internal links. |
| `heading-checker` | Missing-heading checker | Findings: missing/duplicate H1, skips. |
| `local-checklist` | Local-business SEO checklist | Scored checklist + fixes. |

## Tier 2 modules

| id | Title | Notes |
| --- | --- | --- |
| `content-planner` | Content planner | Topic/keyword clustering → calendar. |
| `article-draft` | AI article draft generator | **DRAFT** content only. |
| `service-page-gen` | Service page generator | DRAFT page proposal. |
| `local-landing-gen` | Local landing page generator | DRAFT page proposal. |
| `internal-link-suggest` | Internal-link suggestions | Additive link ChangeSets. |
| `faq-generator` | FAQ generator | DRAFT + FAQ JSON-LD. |
| `schema-jsonld-builder` | JSON-LD schema builder | Guided structured-data builder. |
| `publishing-queue` | Blog publishing queue | Scheduled, approval-gated publishes. |
| `weekly-report` | Weekly SEO report | Snapshot diff + recommendations. |

## Tier 3 modules

| id | Title | Notes |
| --- | --- | --- |
| `multi-site` | Multi-site dashboard | Cross-site rollups. |
| `client-management` | Client management | Orgs, seats, scoping. |
| `white-label-reports` | White-label reports | Branded exports. |
| `connector-sophia-stack` | Sophia Stack connector | The real connector. |
| `connector-webhook` | Webhook connector | Generic outbound integration. |
| `rbac` | Role-based permissions | owner/agency/developer/client. |
| `approval-workflows` | Approval workflows | Multi-step publish gating. |

## Module ⇄ connector capability

A module's `plan()`/apply path depends on connector `capabilities`. Example: the
`schema-basic` module can always **analyze**, but only emits an *applyable*
ChangeSet when the connector reports `canAddSchema` (Sophia Stack: via `html`
block today, native `seo.jsonLd` once extension R1 lands). Otherwise the finding
is delivered as **report-only** with copy-paste output.

## Adding a module

1. Implement `SeoModule` under `packages/core/src/<area>/`.
2. Register it in `packages/shared/src/modules.ts` with its minimum tier.
3. Expose it in the dashboard only through the tier-gated registry.
4. If it needs a site capability the connector lacks, add it to the connector
   `capabilities` and, if it requires Sophia Stack changes, to
   `docs/sophia-stack-extension-requirements.md`.
