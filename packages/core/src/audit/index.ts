export { auditCore } from "./audit-core.js";
export { scoreFindings } from "./score.js";

import type { AuditScore, Finding } from "@sophiaxt/seo-shared";
import type { ModuleContext } from "../module.js";
import { auditCore } from "./audit-core.js";
import { scoreFindings } from "./score.js";

/** Run the core audit and attach a score. The dashboard's "Run audit" entry. */
export async function runAudit(ctx: ModuleContext): Promise<{ findings: Finding[]; score: AuditScore }> {
  const findings = await auditCore.analyze(ctx);
  return { findings, score: scoreFindings(findings) };
}
