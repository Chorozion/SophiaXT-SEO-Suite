import type { ModuleId, Tier } from "@sophiaxt/seo-shared";
import { isModuleEnabled } from "@sophiaxt/seo-shared";
import type { SeoModule } from "./module.js";
import { auditCore } from "./audit/audit-core.js";
import { metaEditor } from "./seo/meta-editor.js";

/**
 * Implemented module instances, keyed by id. Only modules that actually exist
 * live here; the broader catalog (including `(later)` items) is in
 * @sophiaxt/seo-shared `MODULES`. The dashboard resolves a module through
 * `getModule`, which also enforces tier gating.
 */
const IMPLEMENTED: Partial<Record<ModuleId, SeoModule>> = {
  "audit-core": auditCore,
  "meta-editor": metaEditor,
};

/** Get a module if it's implemented AND enabled for the tier; else null. */
export function getModule(id: ModuleId, tier: Tier): SeoModule | null {
  if (!isModuleEnabled(id, tier)) return null;
  return IMPLEMENTED[id] ?? null;
}

/** All modules available to a tier right now. */
export function availableModules(tier: Tier): SeoModule[] {
  return (Object.keys(IMPLEMENTED) as ModuleId[])
    .filter((id) => isModuleEnabled(id, tier))
    .map((id) => IMPLEMENTED[id]!)
    .filter(Boolean);
}
