import { z } from "zod";

/**
 * Centralized, validated env access. Secrets are read here once and never
 * hardcoded elsewhere. Call `loadEnv()` at process start. Do NOT log the result.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(16).optional(),

  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  AI_PROVIDER: z.string().default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),
  OPENAI_API_KEY: z.string().optional(),
  INCEPTION_API_KEY: z.string().optional(),

  SOPHIA_STACK_BASE_URL: z.string().url().optional(),
  SOPHIA_STACK_API_TOKEN: z.string().optional(),

  CRAWLER_USER_AGENT: z.string().default("SophiaSEOSuite/0.1 (+https://sophiaxt.com)"),
  CRAWLER_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
  CRAWLER_REQUEST_DELAY_MS: z.coerce.number().int().nonnegative().default(1000),
  CRAWLER_RESPECT_ROBOTS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  CONNECTOR_ENCRYPTION_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Parse and cache process.env. Throws (loudly) on invalid config. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  cached = EnvSchema.parse(source);
  return cached;
}

/** Redact a secret-ish value for safe logging. */
export function redact(value: string | undefined): string {
  if (!value) return "(unset)";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}…${value.slice(-2)}`;
}
