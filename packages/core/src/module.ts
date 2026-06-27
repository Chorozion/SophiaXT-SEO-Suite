import type { Finding, ModuleId, Tier } from "@sophiaxt/seo-shared";
import type { ChangeSet, ReadOnlySite } from "@sophiaxt/seo-connector-core";

/**
 * The context a module receives. `site` is the connector's READ band only — a
 * module structurally cannot apply changes. Apply happens later, from the
 * approval flow.
 */
export interface ModuleContext {
  site: ReadOnlySite;
  tier: Tier;
  /** Optional module-specific config (validated by the module with Zod). */
  config?: Record<string, unknown>;
}

/**
 * A unit of SEO capability.
 *   analyze() — read-only; returns findings.
 *   plan()    — turns findings/intent into a previewable ChangeSet (never applies).
 */
export interface SeoModule {
  readonly id: ModuleId;
  readonly title: string;
  analyze(ctx: ModuleContext): Promise<Finding[]>;
  plan?(ctx: ModuleContext, input: unknown): Promise<ChangeSet>;
}
