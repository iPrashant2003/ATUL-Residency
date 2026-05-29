import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Dashboard stats for admin
export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
      totalTenants,
      totalRooms,
      occupiedRooms,
      currentMonthRent,
      allRentRecords,
      pendingPayments,
      openMaintenance,
    ] = await Promise.all([
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.room.count(),
      prisma.room.count({ where: { isOccupied: true } }),
      prisma.rentRecord.findMany({
        where: { month: currentMonth, year: currentYear },
      }),
      prisma.rentRecord.findMany({
        where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
        include: { tenant: { include: { room: { include: { tower: true } } } } },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.maintenanceRequest.count({ where: { status: "OPEN" } }),
    ]);

    const totalExpected = currentMonthRent.reduce((s, r) => s + r.totalAmount, 0);
    const totalReceived = currentMonthRent.reduce((s, r) => s + r.amountPaid, 0);
    const totalPending = totalExpected - totalReceived;
    const overdue = currentMonthRent.filter((r) => r.status === "OVERDUE").length;
    const paid = currentMonthRent.filter((r) => r.status === "PAID").length;

    // Monthly trend (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const trend = await Promise.all(
      months.map(async ({ month, year }) => {
        const records = await prisma.rentRecord.findMany({ where: { month, year } });
        return {
          name: new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "short" }),
          collected: records.reduce((s, r) => s + r.amountPaid, 0),
          expected: records.reduce((s, r) => s + r.totalAmount, 0),
        };
      })
    );

    // Tower stats
    const towers = await prisma.tower.findMany({
      include: {
        rooms: {
          include: {
            tenant: {
              include: {
                rentRecords: { where: { month: currentMonth, year: currentYear } },
              },
            },
          },
        },
      },
    });

    const towerStats = towers.map((t) => ({
      id: t.id,
      name: t.name,
      totalRooms: t.rooms.length,
      occupiedRooms: t.rooms.filter((r) => r.isOccupied).length,
      totalRent: t.rooms.reduce((s, r) => {
        const rec = r.tenant?.rentRecords[0];
        return s + (rec?.totalAmount || 0);
      }, 0),
      collected: t.rooms.reduce((s, r) => {
        const rec = r.tenant?.rentRecords[0];
        return s + (rec?.amountPaid || 0);
      }, 0),
    }));

    return NextResponse.json({
      totalTenants,
      totalRooms,
      occupiedRooms,
      vacantRooms: totalRooms - occupiedRooms,
      totalExpected,
      totalReceived,
      totalPending,
      overdue,
      paid,
      pendingPayments,
      openMaintenance,
      trend,
      towerStats,
      recentPending: allRentRecords,
      collectionRate: totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
