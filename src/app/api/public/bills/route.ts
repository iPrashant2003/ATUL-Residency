import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getMonthName } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  await headers();
  try {

    const tenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        roomId: { not: null },
      },
      include: {
        room: { include: { tower: true } },
        rentRecords: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 5,
        },
      },
      orderBy: [{ room: { towerId: "asc" } }, { room: { number: "asc" } }],
    });

    const MONTHS = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const result = tenants.map((t) => {
      // Find latest pending/overdue record, or default to the most recent record
      const pendingRecord = t.rentRecords.find(
        (r) => r.status === "PENDING" || r.status === "OVERDUE" || r.status === "PARTIAL"
      ) || t.rentRecords[0];

      const balance = pendingRecord
        ? Math.max(0, pendingRecord.totalAmount - pendingRecord.amountPaid)
        : t.rentAmount;

      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantPhone: t.whatsapp || t.phone,
        roomNumber: t.room?.number || "—",
        towerName: t.room?.tower?.name || "",
        rentRecordId: pendingRecord?.id || null,
        month: pendingRecord?.month || (new Date().getMonth() + 1),
        monthName: pendingRecord ? (MONTHS[pendingRecord.month] || "") : getMonthName(new Date().getMonth() + 1),
        year: pendingRecord?.year || new Date().getFullYear(),
        rentAmount: pendingRecord ? pendingRecord.rentAmount : t.rentAmount,
        electricityBill: pendingRecord ? pendingRecord.electricityBill : 0,
        meterReading: pendingRecord?.meterReading || null,
        maintenanceCharge: pendingRecord ? pendingRecord.maintenanceCharge : 0,
        lateFee: pendingRecord ? pendingRecord.lateFee : 0,
        discount: pendingRecord ? pendingRecord.discount : 0,
        totalAmount: pendingRecord ? pendingRecord.totalAmount : t.rentAmount,
        amountPaid: pendingRecord ? pendingRecord.amountPaid : 0,
        balance,
        status: pendingRecord ? pendingRecord.status : "PENDING",
      };
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  } catch (error) {
    console.error("Public bills API error:", error);
    return NextResponse.json({ error: "Failed to fetch active bills" }, { status: 500 });
  }
}
