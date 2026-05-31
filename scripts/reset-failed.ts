import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;

if (databaseUrl && (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"))) {
  const { Pool } = require("pg");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter } as any);
} else {
  const path = require("path");
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  prisma = new PrismaClient({ adapter } as any);
}

async function main() {
  const result = await prisma.whatsappQueue.updateMany({
    where: { status: "FAILED" },
    data: { status: "PENDING" },
  });
  console.log(`Successfully reset ${result.count} FAILED messages to PENDING.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
