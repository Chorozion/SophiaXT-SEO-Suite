/**
 * Worker entrypoint (skeleton). In production this constructs BullMQ Workers
 * bound to Redis and dispatches jobs to the processors. Left minimal for the
 * foundation stage — wiring the live Queue/Worker is a TODO so the package
 * builds without a running Redis.
 */
import { QUEUES, redisConnectionFromEnv } from "./queues.js";
import { processAuditJob } from "./processors/audit.js";

async function main(): Promise<void> {
  const conn = redisConnectionFromEnv();
  // eslint-disable-next-line no-console
  console.log(`[workers] would connect to Redis at ${conn.url}`);
  // eslint-disable-next-line no-console
  console.log(`[workers] queues: ${Object.values(QUEUES).join(", ")}`);

  // TODO: const auditWorker = new Worker(QUEUES.audit, (job) => processAuditJob(job.data), { connection });
  // Foundation: demonstrate the processor runs end-to-end against the mock.
  const demo = await processAuditJob({ siteId: "demo-site", platform: "sophia-stack", tier: "agency" });
  // eslint-disable-next-line no-console
  console.log(`[workers] demo audit: score=${demo.score.overall}, findings=${demo.findings.length}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[workers] fatal:", err);
  process.exitCode = 1;
});
