/**
 * @sophiaxt/seo-workers — background job processors (BullMQ over Redis).
 *
 * Long-running SEO work (crawls, audits, reports) runs here, off the request
 * path. Workers pull site data THROUGH a connector, run pure `@sophiaxt/seo-core`
 * logic, and persist findings/drafts. This is a SKELETON: queue definitions and
 * the audit processor are wired in shape; the Redis connection + DB writes are
 * marked TODO for the foundation stage.
 */
export * from "./queues.js";
export { processAuditJob } from "./processors/audit.js";
export type { AuditJobData } from "./processors/audit.js";
