import type { SophiaModel, SophiaPatchOp } from "../model.js";
import type { SophiaStackTransport } from "./transport.js";

/**
 * Real transport against a live Sophia Stack server's `/api/sophia/*` API.
 *
 * STUB: the request shapes are written out (matching the read-only analysis) but
 * this is intentionally not wired into the foundation build. Swapping
 * `MockTransport` for `HttpTransport` is the only change needed to point the
 * connector at a real site — see TODO.md ("Real Sophia Stack transport").
 */
export interface HttpTransportOptions {
  baseUrl: string;
  /** Editor-scope Bearer token (`mykey-*`). Provided already-decrypted. */
  token: string;
  fetchImpl?: typeof fetch;
}

export class HttpTransport implements SophiaStackTransport {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpTransportOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.token = opts.token;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private headers(write = false): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json" };
    if (write) {
      h["Content-Type"] = "application/json";
      h["Authorization"] = `Bearer ${this.token}`;
    }
    return h;
  }

  async ping() {
    const res = await this.fetchImpl(`${this.baseUrl}/api/sophia/ping`, { headers: this.headers(true) });
    return (await res.json()) as { ok: boolean; site?: string; canWrite?: boolean };
  }

  async getModel(): Promise<SophiaModel> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/sophia/model`, { headers: this.headers() });
    if (!res.ok) throw new Error(`getModel failed: ${res.status}`);
    return (await res.json()) as SophiaModel;
  }

  async patch(ops: SophiaPatchOp[], opts?: { label?: string; dryRun?: boolean }) {
    const url = new URL(`${this.baseUrl}/api/sophia/patch`);
    if (opts?.dryRun) url.searchParams.set("dryRun", "1"); // pending extension R7
    const res = await this.fetchImpl(url.toString(), {
      method: "POST",
      headers: this.headers(true),
      // `label` is forwarded for extension R4; ignored by current servers.
      body: JSON.stringify({ ops, label: opts?.label }),
    });
    if (res.status === 422) throw new Error(`patch rejected (422): ${await res.text()}`);
    if (!res.ok) throw new Error(`patch failed: ${res.status}`);
    return (await res.json()) as { ok: boolean; changed: string[] };
  }

  async rollback() {
    const res = await this.fetchImpl(`${this.baseUrl}/api/sophia/rollback`, {
      method: "POST",
      headers: this.headers(true),
    });
    if (!res.ok) throw new Error(`rollback failed: ${res.status}`);
    return (await res.json()) as { ok: boolean; restored: boolean; remaining: number };
  }

  async versions() {
    const res = await this.fetchImpl(`${this.baseUrl}/api/sophia/versions`, { headers: this.headers(true) });
    if (!res.ok) throw new Error(`versions failed: ${res.status}`);
    return (await res.json()) as { count: number };
  }
}
