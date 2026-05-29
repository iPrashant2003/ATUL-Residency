import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding Atul Residency database...");

  // 1. Delete dependent data first
  await prisma.activityLog.deleteMany({});
  await prisma.otpCode.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.rentRecord.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.tower.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("🧹 Database cleared.");

  // 2. Create two admin users with the same password
  const adminPassword = await bcrypt.hash("Atul@070923", 12);

  const admin1 = await prisma.user.create({
    data: {
      name: "Atul Tiwari",
      email: "atultiwari123321@gmail.com",
      password: adminPassword,
      phone: "6392651108",
      role: "ADMIN",
    },
  });
  console.log("✅ Admin 1 created:", admin1.email);

  const admin2 = await prisma.user.create({
    data: {
      name: "Prashant Tripathi",
      email: "prashantmanitripathi2003@gmail.com",
      password: adminPassword,
      phone: "7388389944",
      role: "ADMIN",
    },
  });
  console.log("✅ Admin 2 created:", admin2.email);

  // 3. Create Tower A with 19 rooms
  const towerA = await prisma.tower.create({
    data: {
      name: "Tower A",
      description: "Main residential block — 19 rooms",
    },
  });
  console.log("✅ Tower A created");

  for (let i = 1; i <= 19; i++) {
    await prisma.room.create({
      data: {
        number: String(i),
        category: "Standard",
        baseRent: 5000,
        meterNumber: `MET-A${String(i).padStart(2, "0")}`,
        towerId: towerA.id,
        isOccupied: false,
      },
    });
  }
  console.log("✅ Tower A: 19 rooms created");

  // 4. Create Tower B with 15 rooms
  const towerB = await prisma.tower.create({
    data: {
      name: "Tower B",
      description: "Secondary residential block — 15 rooms",
    },
  });
  console.log("✅ Tower B created");

  for (let i = 1; i <= 15; i++) {
    await prisma.room.create({
      data: {
        number: String(i),
        category: "Standard",
        baseRent: 5000,
        meterNumber: `MET-B${String(i).padStart(2, "0")}`,
        towerId: towerB.id,
        isOccupied: false,
      },
    });
  }
  console.log("✅ Tower B: 15 rooms created");

  console.log("\n🎉 Seed complete! 2 admins, 2 towers, 34 rooms.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
