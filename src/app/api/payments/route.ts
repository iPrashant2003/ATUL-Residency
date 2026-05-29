import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    const payments = await prisma.payment.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...(status && { status: status as any }),
      },
      include: {
        tenant: {
          include: { room: { include: { tower: true } } },
        },
        rentRecord: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, rentRecordId, amount, method, transactionId, screenshotUrl, notes } = await req.json();

    if (!tenantId || !amount) {
      return NextResponse.json({ error: "Tenant and amount are required" }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        rentRecordId: rentRecordId || null,
        amount: parseFloat(amount),
        method: method || "UPI",
        transactionId: transactionId || null,
        screenshotUrl: screenshotUrl || null,
        notes: notes || null,
        status: "PENDING",
      },
      include: {
        tenant: { include: { room: { include: { tower: true } } } },
      },
    });

    // Notify all admins about the payment
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      const tenant = payment.tenant;
      const roomNo = tenant?.room?.number || "—";
      const towerName = tenant?.room?.tower?.name || "";

      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "PAYMENT_RECEIVED",
          title: `Payment Received from ${tenant?.name}`,
          message: `Room ${roomNo} ${towerName} paid ₹${parseFloat(amount).toLocaleString("en-IN")} via ${method || "UPI"}. Awaiting your approval.`,
        })),
      });
    } catch (notifErr) {
      console.error("[Payment notification error]", notifErr);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 });
  }
}

// Admin: Approve or reject a payment (mark rent as paid/unpaid)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId, status, rentRecordId } = await req.json();

    if (!paymentId || !status) {
      return NextResponse.json({ error: "paymentId and status required" }, { status: 400 });
    }

    const previousPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!previousPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment status
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: status as any,
        verifiedBy: (session.user as any)?.id,
        verifiedAt: new Date(),
      },
      include: {
        tenant: {
          include: {
            user: true,
            room: { include: { tower: true } },
          },
        },
        rentRecord: true,
      },
    });

    // Handle RentRecord adjustments
    const recId = rentRecordId || payment.rentRecordId;
    if (recId) {
      const rec = await prisma.rentRecord.findUnique({ where: { id: recId } });
      if (rec) {
        let newAmountPaid = rec.amountPaid;
        
        if (previousPayment.status !== "APPROVED" && status === "APPROVED") {
          newAmountPaid += payment.amount;
        } else if (previousPayment.status === "APPROVED" && status !== "APPROVED") {
          newAmountPaid = Math.max(0, newAmountPaid - payment.amount);
        }

        const newStatus = newAmountPaid >= rec.totalAmount ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : "PENDING";
        
        await prisma.rentRecord.update({
          where: { id: recId },
          data: { 
            amountPaid: newAmountPaid, 
            status: newStatus as any, 
            paidDate: newStatus === "PAID" ? new Date() : (newAmountPaid === 0 ? null : rec.paidDate) 
          },
        });
      }
    }

    // Notify the tenant
    if (payment.tenant?.user?.id) {
      const roomNo = payment.tenant?.room?.number || "—";
      await prisma.notification.create({
        data: {
          userId: payment.tenant.user.id,
          type: status === "APPROVED" ? "PAYMENT_APPROVED" : "GENERAL",
          title: status === "APPROVED" ? "Payment Approved ✅" : "Payment Rejected ❌",
          message:
            status === "APPROVED"
              ? `Your payment of ₹${payment.amount.toLocaleString("en-IN")} for Room ${roomNo} has been approved. Thank you!`
              : `Your payment of ₹${payment.amount.toLocaleString("en-IN")} was not approved. Please contact the admin.`,
        },
      });
    }

    return NextResponse.json(payment);
  } catch (err) {
    console.error("[payment PATCH]", err);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
