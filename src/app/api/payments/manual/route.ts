import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendPushNotification } from "@/lib/push";
import { formatCurrency } from "@/lib/utils";
import os from "os";

function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if ((iface as any).family === "IPv4" && !(iface as any).internal) {
        return (iface as any).address;
      }
    }
  }
  return "127.0.0.1";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId, rentRecordId, month, year, amount, method, screenshotUrl, notes, transactionId } = body;

    if (!tenantId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Tenant ID and a valid payment amount are required" }, { status: 400 });
    }

    const numAmount = parseFloat(amount);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { user: true, room: { include: { tower: true } } },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Find or locate the target RentRecord
    let targetRentRecord: any = null;

    if (rentRecordId) {
      targetRentRecord = await prisma.rentRecord.findUnique({ where: { id: rentRecordId } });
    } else if (month && year) {
      targetRentRecord = await prisma.rentRecord.findUnique({
        where: { tenantId_month_year: { tenantId, month: parseInt(month), year: parseInt(year) } },
      });
    }

    // If no specific rent record was selected or found, get the latest pending/overdue rent record or create one for current month
    if (!targetRentRecord) {
      targetRentRecord = await prisma.rentRecord.findFirst({
        where: { tenantId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
    }

    // If still no rent record exists, create a default record for current month/year
    if (!targetRentRecord) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const dueDate = new Date(currentYear, currentMonth - 1, 10);

      targetRentRecord = await prisma.rentRecord.create({
        data: {
          tenantId,
          month: currentMonth,
          year: currentYear,
          rentAmount: tenant.rentAmount,
          electricityBill: 0,
          maintenanceCharge: 500,
          totalAmount: tenant.rentAmount + 500,
          amountPaid: 0,
          status: "PENDING",
          dueDate,
        },
      });
    }

    // Create APPROVED Payment record directly by Admin
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        rentRecordId: targetRentRecord.id,
        amount: numAmount,
        method: method || "UPI",
        transactionId: transactionId || `ADM-PAY-${Date.now().toString().slice(-6)}`,
        screenshotUrl: screenshotUrl || null,
        notes: notes || "Manual payment recorded by Admin",
        status: "APPROVED",
        verifiedBy: (session.user as any)?.id,
        verifiedAt: new Date(),
      },
      include: {
        tenant: { include: { room: { include: { tower: true } } } },
        rentRecord: true,
      },
    });

    // Update the RentRecord status & amountPaid
    const updatedAmountPaid = targetRentRecord.amountPaid + numAmount;
    const newStatus = updatedAmountPaid >= targetRentRecord.totalAmount
      ? "PAID"
      : updatedAmountPaid > 0
      ? "PARTIAL"
      : "PENDING";

    const updatedRentRecord = await prisma.rentRecord.update({
      where: { id: targetRentRecord.id },
      data: {
        amountPaid: updatedAmountPaid,
        status: newStatus as any,
        paidDate: newStatus === "PAID" ? new Date() : (targetRentRecord.paidDate || new Date()),
      },
      include: { tenant: { include: { room: { include: { tower: true } } } } },
    });

    // Create Notification for Tenant
    try {
      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "PAYMENT_APPROVED",
          title: "Payment Recorded & Approved! 🎉",
          message: `Your payment of ₹${numAmount.toLocaleString("en-IN")} has been recorded by Admin for Room ${tenant.room?.number || "—"}. Thank you!`,
        },
      });
    } catch (notifErr) {
      console.error("Failed to create manual payment notification:", notifErr);
    }

    // Queue WhatsApp receipt if tenant has WhatsApp number
    if (tenant.whatsapp) {
      try {
        const host = req.headers.get("host") || "localhost:3000";
        let invoiceUrl = "";
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          const lanIp = getLanIp();
          const port = host.split(":")[1] || "3000";
          invoiceUrl = `http://${lanIp}:${port}/api/rent/${updatedRentRecord.id}/invoice`;
        } else {
          invoiceUrl = `https://${host}/api/rent/${updatedRentRecord.id}/invoice`;
        }

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = months[updatedRentRecord.month - 1] || "Billing Month";

        const isPaid = newStatus === "PAID";
        const whatsappMsg = `✨ *ATUL RESIDENCY* ✨\n👑 *Payment Receipt Recorded* 👑\n\nDear *${tenant.name}*,\n\nA payment of *${formatCurrency(numAmount)}* has been successfully recorded and verified for your account. 💰\n\n🏠 *Room*: ${tenant.room?.number || "—"} (${tenant.room?.tower?.name || ""})\n🗓️ *Billing Period*: ${monthName} ${updatedRentRecord.year}\n${isPaid ? `✅ *Overall Status*: PAID / Verified\n` : `⏳ *Overall Status*: PARTIALLY PAID\n`}\n-------------------------------\n💰 *Total Paid This Month*: ${formatCurrency(updatedAmountPaid)} / ${formatCurrency(updatedRentRecord.totalAmount)}\n-------------------------------\n\n📄 *View & Download PDF Receipt*:\n${invoiceUrl}\n\nThanking you for your residency: Atul Residency. 🌟\n\nWarm regards,\n*Atul Tiwari*\nAtul Residency`;

        await prisma.whatsappQueue.create({
          data: {
            number: tenant.whatsapp,
            message: whatsappMsg,
            status: "PENDING",
          },
        });
      } catch (whatsappErr: any) {
        console.error("Failed to auto-queue WhatsApp manual payment message:", whatsappErr.message);
      }
    }

    // Push notification to tenant
    if (tenant.userId) {
      sendPushNotification(
        tenant.userId,
        "Payment Approved! 🎉",
        `Hi ${tenant.name}, payment of ₹${numAmount.toLocaleString("en-IN")} was verified for Room ${tenant.room?.number || "—"}.`,
        "/tenant/payments"
      ).catch((e) => console.error("Push notify error:", e));
    }

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${numAmount.toLocaleString("en-IN")} recorded successfully!`,
      payment,
      rentRecord: updatedRentRecord,
    });
  } catch (error: any) {
    console.error("[Manual Payment Error]", error);
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 });
  }
}
