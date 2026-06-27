/**
 * @sophiaxt/seo-connector-sophia-stack
 *
 * The real-ish connector to Sophia Stack. It maps the suite's abstract SEO
 * operations onto Sophia Stack's Site Model + patch ops + rollback (see
 * docs/sophia-stack-readonly-analysis.md). It runs against either:
 *   - an in-memory MockTransport (default; mirrors model.json), or
 *   - an HttpTransport hitting a real `/api/sophia/*` server (stub).
 *
 * Only the transport differs; the SEO→patch mapping is written once.
 */
export { SophiaStackConnector } from "./connector.js";
export { MockTransport } from "./transport/mock.js";
export { HttpTransport } from "./transport/http.js";
export { CtxTransport } from "./transport/ctx.js";
export type { SophiaCtxLike } from "./transport/ctx.js";
export type { SophiaStackTransport } from "./transport/transport.js";
export { SAMPLE_MODEL } from "./fixture.js";
export type { SophiaModel, SophiaPatchOp } from "./model.js";
