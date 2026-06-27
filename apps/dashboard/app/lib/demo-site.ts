import { readOnly } from "@sophiaxt/seo-connector-core";
import { SophiaStackConnector } from "@sophiaxt/seo-connector-sophia-stack";
import { runAudit } from "@sophiaxt/seo-core";
import type { Tier } from "@sophiaxt/seo-shared";

/**
 * Foundation-stage helper: spin up the Sophia Stack MOCK connector and run a real
 * audit against the in-memory sample model. This lets the dashboard render the
 * full read → analyze → findings flow with no database and no live site. Replace
 * with a real per-site connector factory + DB once those land (see TODO.md).
 */
export async function getDemoAudit(tier: Tier = "agency") {
  const connector = new SophiaStackConnector({ id: "demo-site" });
  await connector.connect();
  const site = await connector.getSite();
  const audit = await runAudit({ site: readOnly(connector), tier });
  return { site, ...audit };
}
