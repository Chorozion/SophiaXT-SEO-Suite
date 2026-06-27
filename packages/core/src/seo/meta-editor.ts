import { z } from "zod";
import type { Finding } from "@sophiaxt/seo-shared";
import type { ChangeSet } from "@sophiaxt/seo-connector-core";
import type { ModuleContext, SeoModule } from "../module.js";

/** Validated input for a meta edit. Boundary-checked before planning. */
export const MetaEditInput = z.object({
  pageId: z.string().min(1),
  title: z.string().min(1).max(70).optional(),
  description: z.string().min(1).max(200).optional(),
  canonical: z.string().url().optional(),
});
export type MetaEditInput = z.infer<typeof MetaEditInput>;

/**
 * meta-editor — propose page title/description/canonical edits.
 *
 * `analyze` reuses the audit's meta findings shape (missing/oversized meta).
 * `plan` validates input and asks the connector to PLAN the change — it returns a
 * previewable ChangeSet and applies NOTHING. Apply happens after approval.
 */
export const metaEditor: SeoModule = {
  id: "meta-editor",
  title: "Page title / meta editor",

  async analyze(ctx: ModuleContext): Promise<Finding[]> {
    const seoState = await ctx.site.getSeoState();
    const findings: Finding[] = [];
    for (const [pageId, meta] of Object.entries(seoState.pages)) {
      if (!meta.title) {
        findings.push({
          code: "meta.title.missing",
          module: "meta-editor",
          severity: "high",
          title: `"${pageId}" is missing a title`,
          target: { scope: "page", pageId },
          suggestedChange: { kind: "meta", summary: "Set a page title." },
        });
      }
      if (!meta.description) {
        findings.push({
          code: "meta.description.missing",
          module: "meta-editor",
          severity: "high",
          title: `"${pageId}" is missing a meta description`,
          target: { scope: "page", pageId },
          suggestedChange: { kind: "meta", summary: "Set a meta description." },
        });
      }
    }
    return findings;
  },

  async plan(ctx: ModuleContext, rawInput: unknown): Promise<ChangeSet> {
    const input = MetaEditInput.parse(rawInput); // throws on invalid → boundary guard
    if (!ctx.site.capabilities.canEditMeta) {
      // Degrade to report-only; the connector still returns a previewable set.
    }
    // The connector owns the platform-native op generation + preview.
    return planViaConnector(ctx, input);
  },
};

/**
 * Bridge: the module holds a READ-only site, but planning needs the connector's
 * plan band. In the running app the worker passes the full connector's
 * `planMetadataUpdate` in via `ctx.config.planMetadataUpdate`. Kept explicit so
 * modules never gain hidden apply power.
 */
async function planViaConnector(ctx: ModuleContext, input: MetaEditInput): Promise<ChangeSet> {
  const planner = ctx.config?.["planMetadataUpdate"] as
    | ((i: { pageId: string; meta: Record<string, unknown> }) => Promise<ChangeSet>)
    | undefined;
  if (!planner) {
    throw new Error("meta-editor.plan requires a connector planMetadataUpdate in ctx.config");
  }
  const { pageId, ...meta } = input;
  return planner({ pageId, meta });
}
