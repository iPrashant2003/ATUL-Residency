import { prisma } from "../src/lib/prisma";
import Database from "better-sqlite3";
import path from "path";

async function runMigration() {
  const sqliteDbPath = path.join(__dirname, "..", "prisma", "dev.db");
  console.log("Connecting to SQLite database at:", sqliteDbPath);
  const sqlite = new Database(sqliteDbPath);

  console.log("Connecting to PostgreSQL database...");
  await prisma.$connect();
  console.log("✓ Connected to both databases successfully.");

  // Order of tables to delete (children first) and restore (parents first)
  const TABLES = [
    "OtpCode",
    "WhatsappQueue",
    "ActivityLog",
    "Notification",
    "Document",
    "MaintenanceRequest",
    "Payment",
    "RentRecord",
    "Tenant",
    "Room",
    "Tower",
    "User"
  ];

  try {
    // 1. Clear PostgreSQL database first (in reverse order to handle foreign key constraints)
    console.log("\n🧹 Clearing existing records in PostgreSQL...");
    for (const table of TABLES) {
      try {
        console.log(`  Deleting rows from "${table}"...`);
        // Use raw query to truncate safely
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (err: any) {
        console.log(`  ⚠️ Warning: Could not truncate ${table}: ${err.message}`);
      }
    }

    // 2. Read from SQLite and insert to PostgreSQL (in correct order: User, Tower, Room, Tenant, etc.)
    const tablesToMigrate = [...TABLES].reverse();
    console.log("\n📥 Migrating data from SQLite to PostgreSQL...");

    for (const table of tablesToMigrate) {
      console.log(`📦 Migrating table "${table}"...`);

      // Read rows from SQLite
      let rows: any[] = [];
      try {
        rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
      } catch (err: any) {
        console.log(`  ⚠️ Skipping table "${table}" (does not exist in SQLite or failed: ${err.message})`);
        continue;
      }

      if (rows.length === 0) {
        console.log(`  Table "${table}" is empty in SQLite. Skipping.`);
        continue;
      }

      console.log(`  Found ${rows.length} rows in SQLite. Inserting into PostgreSQL...`);

      // Map rows (convert date strings/booleans from SQLite)
      const formattedRows = rows.map((row: any) => {
        const formatted: any = { ...row };
        
        // SQLite stores booleans as 0 or 1, Postgres expects boolean
        for (const key of Object.keys(formatted)) {
          if (formatted[key] === 1 && (key.startsWith("is") || key === "used" || key === "prefer_related_applications")) {
            formatted[key] = true;
          } else if (formatted[key] === 0 && (key.startsWith("is") || key === "used" || key === "prefer_related_applications")) {
            formatted[key] = false;
          }

          // Convert date strings from SQLite back to Date objects
          if (formatted[key] && typeof formatted[key] === "string" && (key.endsWith("At") || key === "expiresAt" || key === "date")) {
            formatted[key] = new Date(formatted[key]);
          }
        }
        return formatted;
      });

      // Insert into PostgreSQL using raw or prisma
      for (const row of formattedRows) {
        const keys = Object.keys(row);
        const columns = keys.map(k => `"${k}"`).join(", ");
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(", ");
        const values = keys.map(k => row[k]);

        const query = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`;
        await prisma.$executeRawUnsafe(query, ...values);
      }

      console.log(`  ✓ Successfully migrated ${rows.length} rows to "${table}".`);
    }

    console.log("\n==================================================");
    console.log("🎉 DATABASE MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("==================================================\n");

  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

runMigration();
