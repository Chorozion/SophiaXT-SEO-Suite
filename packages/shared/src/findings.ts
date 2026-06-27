import type { ModuleId } from "./modules.js";

/** Severity of an audit finding. */
export const SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * A single audit/analysis result. Findings are read-only observations — they do
 * NOT mutate anything. A finding may carry a `suggestedChange` hint that a module
 * can later turn into a previewable ChangeSet (see connectors/core).
 */
export interface Finding {
  /** Stable code, e.g. "meta.description.missing". */
  code: string;
  module: ModuleId;
  severity: Severity;
  title: string;
  detail?: string;
  /** Where it applies: a page path, block id, or site-wide. */
  target: FindingTarget;
  /** Optional machine-readable hint for a follow-up ChangeSet (not applied here). */
  suggestedChange?: SuggestedChangeHint;
}

export type FindingTarget =
  | { scope: "site" }
  | { scope: "page"; pageId: string }
  | { scope: "block"; pageId: string; blockId: string };

export interface SuggestedChangeHint {
  kind: "meta" | "schema" | "sitemap" | "llms-txt" | "heading" | "link" | "content";
  /** Human summary of the suggested fix. */
  summary: string;
  /** Optional structured payload the planning step can consume. */
  payload?: Record<string, unknown>;
}

/** Roll-up score for a site audit (0–100, higher is better). */
export interface AuditScore {
  overall: number;
  byModule: Partial<Record<ModuleId, number>>;
}
