import type { SophiaModel, SophiaPatchOp } from "../model.js";

/** A named version snapshot (Sophia Stack v1.5 `ctx.versions.list()` entry). */
export interface SophiaVersionInfo {
  id: string;
  ts?: number;
  label?: string;
}

/**
 * Transport abstraction. The connector's SEO→patch mapping is identical whether
 * it talks to the in-extension `ctx`, a real `/api/sophia/*` server, or an
 * in-memory mock; only this boundary changes. Mirrors the subset of Sophia Stack's
 * API the connector uses, updated for v1.5 (named snapshots + targeted rollback).
 */
export interface SophiaStackTransport {
  /** GET /api/sophia/ping — verify reachability + write capability. */
  ping(): Promise<{ ok: boolean; site?: string; canWrite?: boolean }>;
  /** GET /api/sophia/model — read the whole Site Model. */
  getModel(): Promise<SophiaModel>;
  /**
   * POST /api/sophia/patch — validate-before-commit; 422-equivalent throws.
   * `opts.label` names the resulting snapshot (Stack v1.5); `dryRun` is best-effort.
   */
  patch(ops: SophiaPatchOp[], opts?: { label?: string; dryRun?: boolean }): Promise<{ ok: boolean; changed: string[] }>;
  /**
   * Roll back. With an `id` (Stack v1.5) this is a TARGETED rollback of one
   * change; without it, the legacy "undo last". Returns whether anything was
   * restored and how many snapshots remain.
   */
  rollback(id?: string): Promise<{ ok: boolean; restored: boolean; remaining: number }>;
  /**
   * Enumerable version history (Stack v1.5). Returns the count and, when the
   * transport supports it, the named snapshot list.
   */
  versions(): Promise<{ count: number; versions?: SophiaVersionInfo[] }>;
}
