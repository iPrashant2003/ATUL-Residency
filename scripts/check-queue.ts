import { prisma } from "../src/lib/prisma";

async function run() {
  try {
    await prisma.$connect();
    const pendingCount = await prisma.whatsappQueue.count({ where: { status: "PENDING" } });
    const sentCount = await prisma.whatsappQueue.count({ where: { status: "SENT" } });
    const failedCount = await prisma.whatsappQueue.count({ where: { status: "FAILED" } });
    const totalCount = await prisma.whatsappQueue.count();

    console.log("WHATSAPP QUEUE STATUS:");
    console.log(`- Pending: ${pendingCount}`);
    console.log(`- Sent: ${sentCount}`);
    console.log(`- Failed: ${failedCount}`);
    console.log(`- Total: ${totalCount}`);

    if (pendingCount > 0) {
      console.log("\nSome pending messages:");
      const pending = await prisma.whatsappQueue.findMany({
        where: { status: "PENDING" },
        take: 5,
        orderBy: { createdAt: "asc" }
      });
      for (const msg of pending) {
        console.log(`- To: ${msg.number}, Msg: ${msg.message.substring(0, 50)}...`);
      }
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
