import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Approve or reject payment
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, notes } = await req.json();
    const adminId = (session.user as any).id;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status,
        notes,
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
      include: {
        tenant: { include: { room: { include: { tower: true } } } },
        rentRecord: true,
      },
    });

    // If approved and linked to rent record, update rent status
    if (status === "APPROVED" && payment.rentRecordId) {
      const rentRecord = await prisma.rentRecord.findUnique({
        where: { id: payment.rentRecordId },
      });
      if (rentRecord) {
        const newAmountPaid = rentRecord.amountPaid + payment.amount;
        const newStatus = newAmountPaid >= rentRecord.totalAmount ? "PAID" : "PARTIAL";
        await prisma.rentRecord.update({
          where: { id: payment.rentRecordId },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
            paidDate: newStatus === "PAID" ? new Date() : undefined,
          },
        });
      }
    }

    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
