import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendPushNotification } from "@/lib/push";

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

    // Trigger PWA Push Notification to the tenant about payment status
    if (payment.tenant && payment.tenant.userId) {
      const isApproved = status === "APPROVED";
      const messageTitle = isApproved ? "Payment Approved! 🎉" : "Payment Rejected ⚠️";
      const messageBody = isApproved
        ? `Hi ${payment.tenant.name}, your payment of ₹${payment.amount.toLocaleString('en-IN')} has been approved. Thank you!`
        : `Hi ${payment.tenant.name}, your payment of ₹${payment.amount.toLocaleString('en-IN')} was not approved. Please verify details.`;

      await sendPushNotification(
        payment.tenant.userId,
        messageTitle,
        messageBody,
        "/tenant/payments"
      ).catch(e => console.error("Push notify error:", e));
    }

    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
