import type { SophiaModel, SophiaPatchOp } from "../model.js";
import type { SophiaStackTransport, SophiaVersionInfo } from "./transport.js";

/**
 * The slice of a Sophia Stack extension `ctx` this transport needs. Mirrors the
 * integration contract + the v1.5 coordination sync. `ctx.site.read()` is
 * synchronous and returns the model; `ctx.site.patch(ops, label?)` runs
 * validate-before-commit + snapshot + rollback + audit inside the Stack, and
 * (v1.5) names the snapshot with `label`. `ctx.versions` is the v1.5 history API.
 */
export interface SophiaCtxLike {
  site: {
    read(): SophiaModel;
    patch(ops: SophiaPatchOp[], label?: string): { ok: boolean; changed?: string[]; error?: string };
  };
  /** Stack v1.5: enumerable history + targeted rollback. Optional → feature-detected. */
  versions?: {
    list(): SophiaVersionInfo[] | Promise<SophiaVersionInfo[]>;
    rollbackTo(id: string): { ok: boolean } | Promise<{ ok: boolean }>;
  };
}

/**
 * In-process transport backed by the Stack extension `ctx` — the PRIMARY, real
 * integration. Reads are synchronous under the hood; the interface stays async
 * for parity with HTTP/mock.
 *
 * v1.5: with `ctx.versions` present, the connector gets true `supportsRollback`
 * and `versioning: "addressable"`. If a deployment somehow lacks it (older host),
 * the transport degrades to no-history rather than throwing — the manifest's
 * `requires.sophiaStack ">=1.5.0"` is the real gate.
 */
export class CtxTransport implements SophiaStackTransport {
  constructor(private readonly ctx: SophiaCtxLike) {}

  /** True when the host exposes the v1.5 versions API. */
  get hasVersions(): boolean {
    return typeof this.ctx.versions?.list === "function" && typeof this.ctx.versions?.rollbackTo === "function";
  }

  async ping() {
    const model = this.ctx.site.read();
    return { ok: true, site: model.site, canWrite: true };
  }

  async getModel(): Promise<SophiaModel> {
    return this.ctx.site.read();
  }

  async patch(ops: SophiaPatchOp[], opts?: { label?: string; dryRun?: boolean }) {
    if (opts?.dryRun) {
      // No ctx dry-run; report intent without writing.
      return { ok: true, changed: [] };
    }
    const r = this.ctx.site.patch(ops, opts?.label);
    if (!r.ok) throw new Error(`ctx.site.patch rejected: ${r.error ?? "unknown"}`);
    return { ok: true, changed: r.changed ?? [] };
  }

  async rollback(id?: string) {
    if (!this.hasVersions || !id) {
      // No ctx rollback trigger without the v1.5 versions API + a target id.
      return { ok: false, restored: false, remaining: 0 };
    }
    const r = await this.ctx.versions!.rollbackTo(id);
    const remaining = (await this.versions()).count;
    return { ok: !!r.ok, restored: !!r.ok, remaining };
  }

  async versions() {
    if (!this.hasVersions) return { count: 0 };
    const list = await this.ctx.versions!.list();
    return { count: list.length, versions: list };
  }
}
