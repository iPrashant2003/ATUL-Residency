import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const record = await prisma.rentRecord.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            room: {
              include: {
                tower: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Rent record not found" }, { status: 404 });
    }

    const balance = record.totalAmount - record.amountPaid;

    const MONTHS = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return NextResponse.json({
      recordId: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenant.name,
      tenantPhone: record.tenant.phone,
      roomNumber: record.tenant?.room?.number || "—",
      towerName: record.tenant?.room?.tower?.name || "",
      month: record.month,
      monthName: MONTHS[record.month] || `Month ${record.month}`,
      year: record.year,
      rentAmount: record.rentAmount,
      electricityBill: record.electricityBill,
      maintenanceCharge: record.maintenanceCharge,
      lateFee: record.lateFee,
      discount: record.discount,
      totalAmount: record.totalAmount,
      amountPaid: record.amountPaid,
      balance: Math.max(0, balance),
      status: record.status,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Public rent detail API error:", error);
    return NextResponse.json({ error: "Failed to fetch rent details" }, { status: 500 });
  }
}
