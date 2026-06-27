/**
 * Queue names + connection config. Kept dependency-light so this module is
 * importable without a live Redis (the actual Queue/Worker construction happens
 * in main.ts at process start).
 */
export const QUEUES = {
  crawl: "crawl",
  audit: "audit",
  report: "report",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Read Redis connection from env at call time (never hardcode). */
export function redisConnectionFromEnv(env: NodeJS.ProcessEnv = process.env): { url: string } {
  return { url: env.REDIS_URL ?? "redis://localhost:6379" };
}

/** Crawler politeness, read from env. Enforced by the crawl processor. */
export function crawlerPolicyFromEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    userAgent: env.CRAWLER_USER_AGENT ?? "SophiaSEOSuite/0.1 (+https://sophiaxt.com)",
    maxConcurrency: Number(env.CRAWLER_MAX_CONCURRENCY ?? 2),
    requestDelayMs: Number(env.CRAWLER_REQUEST_DELAY_MS ?? 1000),
    respectRobots: (env.CRAWLER_RESPECT_ROBOTS ?? "true") === "true",
  };
}
