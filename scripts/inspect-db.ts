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
  console.log("--- WHATSAPP QUEUE (last 10) ---");
  const queue = await prisma.whatsappQueue.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  queue.forEach((q) => {
    console.log(`ID: ${q.id} | To: ${q.number} | Status: ${q.status} | Msg: ${q.message.substring(0, 60)}... | Error: ${q.error}`);
  });

  console.log("\n--- NOTIFICATIONS (last 10) ---");
  const notifs = await prisma.notification.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
  notifs.forEach((n) => {
    console.log(`ID: ${n.id} | User: ${n.user.name} (${n.user.email}) | Type: ${n.type} | Title: ${n.title} | Msg: ${n.message}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
