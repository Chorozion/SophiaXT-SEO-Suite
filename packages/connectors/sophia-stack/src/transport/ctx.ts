import type { SophiaModel, SophiaPatchOp } from "../model.js";
import type { SophiaStackTransport } from "./transport.js";

/**
 * The slice of a Sophia Stack extension `ctx` this transport needs. Mirrors the
 * integration contract (`docs/extensions/sophia-seo-suite-contract.md` in the
 * Sophia Stack repo). `ctx.site.read()` is synchronous and returns the model;
 * `ctx.site.patch(ops)` runs validate-before-commit + snapshot + rollback + audit
 * inside the Stack automatically.
 */
export interface SophiaCtxLike {
  site: {
    read(): SophiaModel;
    patch(ops: SophiaPatchOp[]): { ok: boolean; changed?: string[]; error?: string };
  };
}

/**
 * In-process transport backed by the Stack extension `ctx`. This is the PRIMARY,
 * real integration: when the Suite runs as an installed Stack extension it talks
 * to the host through `ctx`, not over HTTP. Reads are synchronous under the hood
 * but the transport interface stays async for parity with HTTP/mock.
 *
 * Capability note: `ctx` exposes no rollback or version-history read, so a
 * connector using this transport should be constructed with
 * `{ supportsRollback: false, versioning: "none" }`. Rollback safety still
 * happens automatically inside the Stack on every `patch`; the extension just
 * can't trigger or enumerate it.
 */
export class CtxTransport implements SophiaStackTransport {
  constructor(private readonly ctx: SophiaCtxLike) {}

  async ping() {
    const model = this.ctx.site.read();
    return { ok: true, site: model.site, canWrite: true };
  }

  async getModel(): Promise<SophiaModel> {
    return this.ctx.site.read();
  }

  async patch(ops: SophiaPatchOp[]) {
    const r = this.ctx.site.patch(ops);
    if (!r.ok) throw new Error(`ctx.site.patch rejected: ${r.error ?? "unknown"}`);
    return { ok: true, changed: r.changed ?? [] };
  }

  async rollback() {
    // No ctx-level rollback today (see contract). Safety still applies inside the
    // Stack automatically on each patch; the extension cannot trigger undo.
    return { ok: false, restored: false, remaining: 0 };
  }

  async versions() {
    return { count: 0 };
  }
}
