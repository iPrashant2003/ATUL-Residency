import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import * as readline from "readline";

// =====================================================
// 🛡️ SAFETY GUARD: This script WIPES ALL DATA.
// It will force you to confirm before proceeding.
// =====================================================

async function confirmDangerousOperation(): Promise<boolean> {
  // Check if there are any tenants in the database
  const tenantCount = await prisma.tenant.count();
  const rentCount = await prisma.rentRecord.count();
  const paymentCount = await prisma.payment.count();
  
  if (tenantCount === 0 && rentCount === 0 && paymentCount === 0) {
    console.log("ℹ️ Database has no tenant/rent/payment data. Proceeding with seed...");
    return true;
  }

  console.log("\n⚠️ ═══════════════════════════════════════════════════════");
  console.log("⚠️  DANGER: DATABASE CONTAINS LIVE DATA!");
  console.log("⚠️ ═══════════════════════════════════════════════════════");
  console.log(`   📋 Tenants: ${tenantCount}`);
  console.log(`   📋 Rent Records: ${rentCount}`);
  console.log(`   📋 Payments: ${paymentCount}`);
  console.log("⚠️ ═══════════════════════════════════════════════════════");
  console.log("⚠️  Running seed will DELETE ALL THIS DATA permanently!");
  console.log("⚠️  Run 'npm run db:backup' first if you haven't!");
  console.log("⚠️ ═══════════════════════════════════════════════════════\n");

  // Force manual confirmation
  if (process.env.FORCE_SEED === 'true') {
    console.log("🔓 FORCE_SEED=true detected. Skipping confirmation...");
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Type 'DELETE ALL DATA' to confirm: ", (answer) => {
      rl.close();
      if (answer.trim() === 'DELETE ALL DATA') {
        console.log("✅ Confirmed. Proceeding...");
        resolve(true);
      } else {
        console.log("❌ Aborted. Your data is safe.");
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log("🌱 Seeding Atul Residency database...\n");

  // Safety check before wiping
  const confirmed = await confirmDangerousOperation();
  if (!confirmed) {
    process.exit(0);
  }

  // Auto-backup before wiping (safety net)
  console.log("💾 Creating automatic pre-seed backup...");
  try {
    const { execSync } = require("child_process");
    execSync("node scripts/backup-db.js", { stdio: "inherit", cwd: process.cwd() });
    console.log("✅ Pre-seed backup created successfully.\n");
  } catch (err) {
    console.warn("⚠️ Could not create pre-seed backup. Continuing anyway...\n");
  }

  // 1. Delete dependent data first
  await prisma.pushSubscription.deleteMany({});
  await prisma.whatsappQueue.deleteMany({});
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
