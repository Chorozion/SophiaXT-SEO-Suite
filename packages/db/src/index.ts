/**
 * @sophiaxt/seo-db — Prisma client singleton.
 *
 * NOTE: `@prisma/client` is generated from prisma/schema.prisma via
 * `pnpm db:generate`. Until then this import won't resolve — that's expected in
 * the foundation stage (see TODO.md). The singleton avoids exhausting Postgres
 * connections during Next.js dev hot-reload.
 */
// @ts-expect-error generated client not present until `prisma generate` runs
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type { PrismaClient } from "@prisma/client";
