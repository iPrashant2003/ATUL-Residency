import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

// Load environment variables (.env, .env.local, etc.)
loadEnvConfig(process.cwd());

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  // Use PostgreSQL adapter when DATABASE_URL is a PostgreSQL connection string
  if (databaseUrl && (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"))) {
    const { Pool } = require("pg");
    const { PrismaPg } = require("@prisma/adapter-pg");

    // Pool with keep-alive + timeout to survive Neon idle disconnections
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 5,                          // max connections in pool
      idleTimeoutMillis: 30000,        // close idle connections after 30s
      connectionTimeoutMillis: 10000,  // fail fast if can't connect in 10s
      ssl: { rejectUnauthorized: false },
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Log pool errors so they don't silently crash
    pool.on("error", (err: Error) => {
      console.error("[Prisma Pool] Unexpected error on idle client:", err.message);
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter } as any);
  }

  // Do not fall back to SQLite on Vercel or in production if DATABASE_URL is not set
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return new PrismaClient();
  }

  // Fallback to SQLite for local development
  try {
    const path = require("path");
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter } as any);
  } catch (e) {
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
