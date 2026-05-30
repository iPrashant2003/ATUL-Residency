const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("✓ Connected successfully.");

    const userCount = await prisma.user.count();
    const towerCount = await prisma.tower.count();
    const roomCount = await prisma.room.count();
    const tenantCount = await prisma.tenant.count();
    const rentCount = await prisma.rentRecord.count();
    const paymentCount = await prisma.payment.count();
    const subCount = await prisma.pushSubscription.count();

    console.log("DATABASE STATUS REPORT:");
    console.log(`- Users: ${userCount}`);
    console.log(`- Towers: ${towerCount}`);
    console.log(`- Rooms: ${roomCount}`);
    console.log(`- Tenants: ${tenantCount}`);
    console.log(`- Rent Records: ${rentCount}`);
    console.log(`- Payments: ${paymentCount}`);
    console.log(`- Push Subscriptions: ${subCount}`);

  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
