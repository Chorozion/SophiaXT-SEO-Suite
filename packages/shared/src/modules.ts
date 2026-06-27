import type { Tier } from "./tiers.js";
import { tierSatisfies } from "./tiers.js";

/**
 * The module registry. Each SEO capability is a module with a minimum tier.
 * The dashboard, workers, and API all gate on this single map — no scattered
 * `if (tier === ...)` checks. `(later)` modules are declared so the architecture
 * can hold them, but `implemented: false` keeps them out of the active set.
 */
export const MODULE_IDS = [
  // Tier 1 — Starter
  "audit-core",
  "meta-editor",
  "alt-text-checker",
  "sitemap-generator",
  "robots-helper",
  "llms-txt-generator",
  "schema-basic",
  "broken-link-checker",
  "heading-checker",
  "local-checklist",
  // Tier 2 — Growth
  "content-planner",
  "article-draft",
  "service-page-gen",
  "local-landing-gen",
  "internal-link-suggest",
  "faq-generator",
  "schema-jsonld-builder",
  "publishing-queue",
  "search-console", // later
  "weekly-report",
  // Tier 3 — Agency
  "multi-site",
  "client-management",
  "white-label-reports",
  "connector-sophia-stack",
  "connector-webhook",
  "connector-wordpress", // later
  "connector-wix", // later
  "connector-webflow", // later
  "connector-shopify", // later
  "ai-visibility", // later
  "backlink-tracking", // later
  "rbac",
  "approval-workflows",
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export interface ModuleDef {
  id: ModuleId;
  title: string;
  tier: Tier;
  /** False = declared for architecture, not yet built ("later" items + stubs). */
  implemented: boolean;
  /** Short capability description shown in UI/registry. */
  summary: string;
}

export const MODULES: Record<ModuleId, ModuleDef> = {
  // Tier 1
  "audit-core": { id: "audit-core", title: "Site SEO audit", tier: "starter", implemented: true, summary: "Read-only audit across title/meta/headings/links/schema." },
  "meta-editor": { id: "meta-editor", title: "Page title / meta editor", tier: "starter", implemented: true, summary: "Draft title + description edits." },
  "alt-text-checker": { id: "alt-text-checker", title: "Image alt-text checker", tier: "starter", implemented: false, summary: "Find images missing/weak alt text." },
  "sitemap-generator": { id: "sitemap-generator", title: "Sitemap generator", tier: "starter", implemented: false, summary: "Propose sitemap.xml." },
  "robots-helper": { id: "robots-helper", title: "robots.txt helper", tier: "starter", implemented: false, summary: "Propose + validate robots.txt." },
  "llms-txt-generator": { id: "llms-txt-generator", title: "llms.txt generator", tier: "starter", implemented: false, summary: "Propose llms.txt." },
  "schema-basic": { id: "schema-basic", title: "Basic schema generator", tier: "starter", implemented: false, summary: "Org/WebSite/LocalBusiness JSON-LD." },
  "broken-link-checker": { id: "broken-link-checker", title: "Broken-link checker", tier: "starter", implemented: false, summary: "Find dead internal/external links." },
  "heading-checker": { id: "heading-checker", title: "Missing-heading checker", tier: "starter", implemented: false, summary: "Find missing/duplicate H1 + skips." },
  "local-checklist": { id: "local-checklist", title: "Local-business SEO checklist", tier: "starter", implemented: false, summary: "Scored local-SEO checklist." },
  // Tier 2
  "content-planner": { id: "content-planner", title: "Content planner", tier: "growth", implemented: false, summary: "Topic/keyword clustering → calendar." },
  "article-draft": { id: "article-draft", title: "AI article draft generator", tier: "growth", implemented: false, summary: "Draft-only article generation." },
  "service-page-gen": { id: "service-page-gen", title: "Service page generator", tier: "growth", implemented: false, summary: "Draft service page proposals." },
  "local-landing-gen": { id: "local-landing-gen", title: "Local landing page generator", tier: "growth", implemented: false, summary: "Draft local landing pages." },
  "internal-link-suggest": { id: "internal-link-suggest", title: "Internal-link suggestions", tier: "growth", implemented: false, summary: "Additive internal link suggestions." },
  "faq-generator": { id: "faq-generator", title: "FAQ generator", tier: "growth", implemented: false, summary: "Draft FAQs + FAQ JSON-LD." },
  "schema-jsonld-builder": { id: "schema-jsonld-builder", title: "JSON-LD schema builder", tier: "growth", implemented: false, summary: "Guided structured-data builder." },
  "publishing-queue": { id: "publishing-queue", title: "Blog publishing queue", tier: "growth", implemented: false, summary: "Scheduled, approval-gated publishes." },
  "search-console": { id: "search-console", title: "Search Console connection", tier: "growth", implemented: false, summary: "(later) GSC integration." },
  "weekly-report": { id: "weekly-report", title: "Weekly SEO report", tier: "growth", implemented: false, summary: "Snapshot diff + recommendations." },
  // Tier 3
  "multi-site": { id: "multi-site", title: "Multi-site dashboard", tier: "agency", implemented: false, summary: "Cross-site rollups." },
  "client-management": { id: "client-management", title: "Client management", tier: "agency", implemented: false, summary: "Orgs, seats, scoping." },
  "white-label-reports": { id: "white-label-reports", title: "White-label reports", tier: "agency", implemented: false, summary: "Branded exports." },
  "connector-sophia-stack": { id: "connector-sophia-stack", title: "Sophia Stack connector", tier: "agency", implemented: true, summary: "Connect to Sophia Stack sites (mock backend first)." },
  "connector-webhook": { id: "connector-webhook", title: "Webhook connector", tier: "agency", implemented: false, summary: "Generic outbound integration (stub)." },
  "connector-wordpress": { id: "connector-wordpress", title: "WordPress connector", tier: "agency", implemented: false, summary: "(later) stub." },
  "connector-wix": { id: "connector-wix", title: "Wix connector", tier: "agency", implemented: false, summary: "(later) stub." },
  "connector-webflow": { id: "connector-webflow", title: "Webflow connector", tier: "agency", implemented: false, summary: "(later) stub." },
  "connector-shopify": { id: "connector-shopify", title: "Shopify connector", tier: "agency", implemented: false, summary: "(later) stub." },
  "ai-visibility": { id: "ai-visibility", title: "AI-visibility tracking", tier: "agency", implemented: false, summary: "(later)." },
  "backlink-tracking": { id: "backlink-tracking", title: "Backlink-opportunity tracking", tier: "agency", implemented: false, summary: "(later)." },
  "rbac": { id: "rbac", title: "Role-based permissions", tier: "agency", implemented: false, summary: "owner/agency/developer/client roles." },
  "approval-workflows": { id: "approval-workflows", title: "Approval workflows", tier: "agency", implemented: false, summary: "Multi-step publish gating." },
};

/** A module is usable when the tier allows it AND it's actually implemented. */
export function isModuleEnabled(id: ModuleId, tier: Tier): boolean {
  const def = MODULES[id];
  if (!def) return false;
  return def.implemented && tierSatisfies(tier, def.tier);
}

/** All modules a tier *exposes* (implemented + in-tier). */
export function modulesForTier(tier: Tier): ModuleDef[] {
  return MODULE_IDS.map((id) => MODULES[id]).filter(
    (m) => m.implemented && tierSatisfies(tier, m.tier),
  );
}
