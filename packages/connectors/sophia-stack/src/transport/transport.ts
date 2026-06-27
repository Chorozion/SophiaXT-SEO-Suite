import type { SophiaModel, SophiaPatchOp } from "../model.js";

/**
 * Transport abstraction. The connector's SEO→patch mapping is identical whether
 * it talks to an in-memory mock or a real `/api/sophia/*` server; only this
 * boundary changes. Mirrors the subset of Sophia Stack's API the connector uses.
 */
export interface SophiaStackTransport {
  /** GET /api/sophia/ping — verify reachability + write capability. */
  ping(): Promise<{ ok: boolean; site?: string; canWrite?: boolean }>;
  /** GET /api/sophia/model — read the whole Site Model. */
  getModel(): Promise<SophiaModel>;
  /** POST /api/sophia/patch — validate-before-commit; 422-equivalent throws. */
  patch(ops: SophiaPatchOp[], opts?: { label?: string; dryRun?: boolean }): Promise<{ ok: boolean; changed: string[] }>;
  /** POST /api/sophia/rollback — pop last snapshot (stack-style today). */
  rollback(): Promise<{ ok: boolean; restored: boolean; remaining: number }>;
  /** GET /api/sophia/versions — snapshot depth (count today; list after R4). */
  versions(): Promise<{ count: number }>;
}
