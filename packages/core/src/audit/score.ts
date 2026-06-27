import type { AuditScore, Finding, Severity } from "@sophiaxt/seo-shared";

/** Severity → penalty weight. Higher severity costs more. */
const PENALTY: Record<Severity, number> = {
  info: 0,
  low: 2,
  medium: 5,
  high: 10,
  critical: 20,
};

/**
 * Reduce a list of findings to a 0–100 score (100 = clean). Deterministic and
 * pure. The cap keeps a flood of low findings from dominating a single critical.
 */
export function scoreFindings(findings: Finding[]): AuditScore {
  let penalty = 0;
  const byModulePenalty: Record<string, number> = {};
  for (const f of findings) {
    const p = PENALTY[f.severity];
    penalty += p;
    byModulePenalty[f.module] = (byModulePenalty[f.module] ?? 0) + p;
  }
  const overall = clamp(100 - penalty);
  const byModule: AuditScore["byModule"] = {};
  for (const [mod, pen] of Object.entries(byModulePenalty)) {
    byModule[mod as keyof AuditScore["byModule"]] = clamp(100 - pen);
  }
  return { overall, byModule };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
