import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 talks to the database through a "driver adapter".
 * We pick it from the connection string so the same code runs on
 * SQLite locally and on Postgres in production.
 */
function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = url.startsWith("postgres")
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

// Reuse a single client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
