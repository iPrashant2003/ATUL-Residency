import { prisma } from "../src/lib/prisma";
import Database from "better-sqlite3";
import path from "path";

async function run() {
  try {
    const sqliteDbPath = path.join(__dirname, "..", "prisma", "dev.db");
    console.log("Reading SQLite database...");
    const sqlite = new Database(sqliteDbPath);
    const sqliteRooms = sqlite.prepare("SELECT * FROM Room WHERE isOccupied = 1").all();
    const sqliteTenants = sqlite.prepare("SELECT * FROM Tenant").all();
    console.log(`SQLite: Occupied rooms = ${sqliteRooms.length}, Tenants = ${sqliteTenants.length}`);
    for (const r of sqliteRooms) {
      console.log(`- SQLite occupied Room Number: ${r.number}, Tower ID: ${r.towerId}`);
    }
    sqlite.close();

    console.log("\nConnecting to PostgreSQL...");
    await prisma.$connect();
    const pgRooms = await prisma.room.findMany({ where: { isOccupied: true } });
    const pgTenants = await prisma.tenant.findMany();
    console.log(`PostgreSQL: Occupied rooms = ${pgRooms.length}, Tenants = ${pgTenants.length}`);
    for (const r of pgRooms) {
      console.log(`- PostgreSQL occupied Room Number: ${r.number}, Tower ID: ${r.towerId}`);
    }

    const allPgRooms = await prisma.room.findMany();
    console.log(`\nTotal rooms in PG = ${allPgRooms.length}`);
    const occupiedRoomCount = allPgRooms.filter(r => r.isOccupied === true).length;
    console.log(`PG rooms filtered by isOccupied === true: ${occupiedRoomCount}`);

  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
