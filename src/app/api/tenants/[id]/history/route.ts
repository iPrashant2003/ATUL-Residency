import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tenantId } = await params;

    // Fetch tenant details with full room and tower context
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        room: { include: { tower: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fetch up to 24 historic rent records with associated payments and screenshots
    const rentRecords = await prisma.rentRecord.findMany({
      where: { tenantId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 24, // past 2 years coverage
    });

    // Also fetch any standalone payments that might not be linked to a rent record
    const standalonePayments = await prisma.payment.findMany({
      where: { tenantId, rentRecordId: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Calculate 12-month summary stats
    const last12Months = rentRecords.slice(0, 12);
    const totalPaidLastYear = last12Months.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalDueLastYear = last12Months.reduce((sum, r) => sum + r.totalAmount, 0);
    const paidMonthsCount = last12Months.filter((r) => r.status === "PAID" || r.status === "ADVANCE_PAID").length;
    const paymentEfficiency = last12Months.length > 0 ? Math.round((paidMonthsCount / last12Months.length) * 100) : 100;
    const totalPaymentsCount = rentRecords.reduce((sum, r) => sum + r.payments.length, 0) + standalonePayments.length;

    return NextResponse.json({
      tenant,
      rentRecords,
      standalonePayments,
      stats: {
        totalPaidLastYear,
        totalDueLastYear,
        outstandingBalance: Math.max(0, totalDueLastYear - totalPaidLastYear),
        paymentEfficiency,
        totalPaymentsCount,
        monthsTracked: last12Months.length,
      },
    });
  } catch (error: any) {
    console.error("[Tenant History API Error]", error);
    return NextResponse.json({ error: "Failed to fetch tenant history" }, { status: 500 });
  }
}
