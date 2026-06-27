import type { AuditScore, Finding, Tier } from "@sophiaxt/seo-shared";
import { readOnly, type SiteConnector } from "@sophiaxt/seo-connector-core";
import { runAudit } from "@sophiaxt/seo-core";
import { SophiaStackConnector } from "@sophiaxt/seo-connector-sophia-stack";

export interface AuditJobData {
  siteId: string;
  platform: string;
  tier: Tier;
}

/**
 * Audit job processor (skeleton). Resolves a connector for the site, hands the
 * module engine a READ-ONLY view, runs the audit, and returns findings + score.
 *
 * TODO (foundation): persist the AuditRun + Findings to @sophiaxt/seo-db, and
 * resolve the connector via a real factory that decrypts the site's credential.
 * For now it uses the Sophia Stack mock connector so the path is exercisable.
 */
export async function processAuditJob(data: AuditJobData): Promise<{ findings: Finding[]; score: AuditScore }> {
  const connector = resolveConnector(data);
  await connector.connect();
  const result = await runAudit({ site: readOnly(connector), tier: data.tier });
  // TODO: await persistAuditRun(data.siteId, result);
  return result;
}

/** Connector factory (skeleton). Real version decrypts creds + picks transport. */
function resolveConnector(data: AuditJobData): SiteConnector {
  switch (data.platform) {
    case "sophia-stack":
      // Mock transport by default; swap to HttpTransport for a live site.
      return new SophiaStackConnector({ id: data.siteId });
    default:
      throw new Error(`No connector available for platform: ${data.platform}`);
  }
}
