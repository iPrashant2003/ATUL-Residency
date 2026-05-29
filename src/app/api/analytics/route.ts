import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    ] = await Promise.all([
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.room.count(),
      prisma.room.count({ where: { isOccupied: true } }),
      prisma.rentRecord.findMany({
        where: { month: currentMonth, year: currentYear },
      }),
    ]);

    const totalExpected = currentMonthRent.reduce((s, r) => s + r.totalAmount, 0);
    const totalReceived = currentMonthRent.reduce((s, r) => s + r.amountPaid, 0);
    const totalPending = totalExpected - totalReceived;
    const collectionRate = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

    // 12-month trend
    const months = [];
    for (let i = 11; i >= 0; i--) {
      // Handle year wraparound
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      months.push({ month: m, year: y });
    }

    const trend = await Promise.all(
      months.map(async ({ month, year }) => {
        const records = await prisma.rentRecord.findMany({ where: { month, year } });
        return {
          name: new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "short" }),
          collected: records.reduce((s, r) => s + r.amountPaid, 0),
          expected: records.reduce((s, r) => s + r.totalAmount, 0),
          outstanding: records.reduce((s, r) => s + (r.totalAmount - r.amountPaid), 0),
        };
      })
    );

    // Tower stats for current operations
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
      // Target rent is based on active tenant's latest record or base rent
      totalRent: t.rooms.reduce((s, r) => {
        const rec = r.tenant?.rentRecords?.[0];
        if (rec) return s + rec.totalAmount;
        if (r.isOccupied && r.tenant) return s + r.tenant.rentAmount;
        return s;
      }, 0),
      collected: t.rooms.reduce((s, r) => {
        const rec = r.tenant?.rentRecords?.[0];
        return s + (rec?.amountPaid || 0);
      }, 0),
    }));

    return NextResponse.json({
      totalTenants,
      totalRooms,
      occupiedRooms,
      totalExpected,
      totalReceived,
      totalPending,
      collectionRate,
      trend,
      towerStats,
    });
  } catch (error) {
    console.error("[analytics api error]", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
