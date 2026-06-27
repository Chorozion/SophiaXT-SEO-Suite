import type { Finding } from "@sophiaxt/seo-shared";
import type { ModuleContext, SeoModule } from "../module.js";

/**
 * audit-core — the site SEO audit engine SKELETON.
 *
 * It reads the site (read-only) and runs a small set of real checks today, with
 * clearly-marked extension points for the rest (links, images, structured data,
 * performance). Each check is a pure function `(input) => Finding[]` so checks
 * are independently testable and easy to add.
 *
 * This is a skeleton: the check registry is real and a few checks are wired; the
 * heavier checks (broken links, alt text via a crawl) are TODO and live in their
 * own modules (`broken-link-checker`, `alt-text-checker`) once the crawler lands.
 */
export const auditCore: SeoModule = {
  id: "audit-core",
  title: "Site SEO audit",

  async analyze(ctx: ModuleContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const seoState = await ctx.site.getSeoState();
    const pages = await ctx.site.listPages();

    for (const page of pages) {
      const meta = seoState.pages[page.pageId] ?? {};
      for (const check of PAGE_CHECKS) {
        findings.push(...check({ pageId: page.pageId, title: meta.title, description: meta.description, robots: meta.robots, jsonLd: meta.jsonLd }));
      }
    }

    // Site-level checks
    for (const check of SITE_CHECKS) {
      findings.push(...check({ pageCount: pages.length, siteSeo: seoState.site }));
    }

    return findings;
  },
};

/* --- page-level checks ----------------------------------------------------- */

interface PageCheckInput {
  pageId: string;
  title?: string;
  description?: string;
  robots?: string;
  jsonLd?: unknown[];
}
type PageCheck = (input: PageCheckInput) => Finding[];

const TITLE_MIN = 15;
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 160;

const checkTitle: PageCheck = (p) => {
  if (!p.title) {
    return [finding("meta.title.missing", "high", `Page "${p.pageId}" has no <title>`, p.pageId, {
      kind: "meta",
      summary: "Add a descriptive page title (15–60 chars).",
    })];
  }
  const len = p.title.length;
  if (len < TITLE_MIN || len > TITLE_MAX) {
    return [finding("meta.title.length", "medium", `Title length ${len} is outside ${TITLE_MIN}–${TITLE_MAX}`, p.pageId, {
      kind: "meta",
      summary: `Adjust title to ${TITLE_MIN}–${TITLE_MAX} characters.`,
      payload: { current: p.title, length: len },
    })];
  }
  return [];
};

const checkDescription: PageCheck = (p) => {
  if (!p.description) {
    return [finding("meta.description.missing", "high", `Page "${p.pageId}" has no meta description`, p.pageId, {
      kind: "meta",
      summary: "Add a meta description (50–160 chars).",
    })];
  }
  const len = p.description.length;
  if (len < DESC_MIN || len > DESC_MAX) {
    return [finding("meta.description.length", "low", `Description length ${len} is outside ${DESC_MIN}–${DESC_MAX}`, p.pageId, {
      kind: "meta",
      summary: `Adjust description to ${DESC_MIN}–${DESC_MAX} characters.`,
      payload: { current: p.description, length: len },
    })];
  }
  return [];
};

const checkStructuredData: PageCheck = (p) => {
  if (!p.jsonLd || p.jsonLd.length === 0) {
    return [finding("schema.jsonld.missing", "low", `Page "${p.pageId}" has no JSON-LD structured data`, p.pageId, {
      kind: "schema",
      summary: "Add JSON-LD (e.g. Organization / WebPage / LocalBusiness).",
    })];
  }
  return [];
};

const PAGE_CHECKS: PageCheck[] = [checkTitle, checkDescription, checkStructuredData];

/* --- site-level checks ----------------------------------------------------- */

interface SiteCheckInput {
  pageCount: number;
  siteSeo: { description?: string };
}
type SiteCheck = (input: SiteCheckInput) => Finding[];

const checkSiteDescription: SiteCheck = (s) =>
  s.siteSeo.description
    ? []
    : [finding("meta.site-description.missing", "medium", "Site has no default meta description", { scope: "site" }, {
        kind: "meta",
        summary: "Set a site-level default description.",
      })];

const SITE_CHECKS: SiteCheck[] = [checkSiteDescription];

/* --- helper ---------------------------------------------------------------- */

function finding(
  code: string,
  severity: Finding["severity"],
  title: string,
  target: string | Finding["target"],
  suggestedChange?: Finding["suggestedChange"],
): Finding {
  return {
    code,
    module: "audit-core",
    severity,
    title,
    target: typeof target === "string" ? { scope: "page", pageId: target } : target,
    suggestedChange,
  };
}
