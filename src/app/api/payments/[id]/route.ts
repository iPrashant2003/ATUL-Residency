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
        const updatedRentRecord = await prisma.rentRecord.update({
          where: { id: payment.rentRecordId },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
            paidDate: newStatus === "PAID" ? new Date() : undefined,
          },
          include: { tenant: true }
        });

        // If the new status is PAID, automatically queue a WhatsApp receipt message!
        if (newStatus === "PAID" && updatedRentRecord.tenant && updatedRentRecord.tenant.whatsapp) {
          try {
            const record = updatedRentRecord;
            const tenant = updatedRentRecord.tenant;
            const host = req.headers.get("host") || "localhost:3000";
            let invoiceUrl = "";
            if (host.includes("localhost") || host.includes("127.0.0.1")) {
              const lanIp = getLanIp();
              const port = host.split(":")[1] || "3000";
              invoiceUrl = `http://${lanIp}:${port}/api/rent/${record.id}/invoice`;
            } else {
              invoiceUrl = `https://${host}/api/rent/${record.id}/invoice`;
            }

            let breakdown = `🏠 *Rent*: ${formatCurrency(record.rentAmount)}\n`;
            if (record.electricityBill > 0) breakdown += `⚡ *Electricity Bill*: ${formatCurrency(record.electricityBill)}\n`;
            if (record.maintenanceCharge > 0) breakdown += `🔧 *Maintenance*: ${formatCurrency(record.maintenanceCharge)}\n`;
            if (record.lateFee > 0) breakdown += `⏳ *Late Fee*: ${formatCurrency(record.lateFee)}\n`;
            if (record.discount > 0) breakdown += `🎁 *Discount*: -${formatCurrency(record.discount)}\n`;

            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthName = months[record.month - 1] || "Billing Month";

            const whatsappMsg = `🏢 *ATUL RESIDENCY* 🏢\n\n👤 Dear *${tenant.name}*,\n\nHere is your *Payment Receipt* for *${monthName} ${record.year}*.\n\n${breakdown}-------------------------------\n💰 *Amount Paid*: ${formatCurrency(record.totalAmount)}\n✅ *Status*: PAID / Verified\n-------------------------------\n\n📄 *View & Download PDF Receipt*:\n${invoiceUrl}\n\n💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\n🙏 Thank you!`;

            await prisma.whatsappQueue.create({
              data: {
                number: tenant.whatsapp,
                message: whatsappMsg,
                status: "PENDING",
              }
            });
            console.log(`Auto-queued WhatsApp Payment Receipt for ${tenant.name}`);
          } catch (whatsappErr: any) {
            console.error("Failed to auto-queue WhatsApp receipt:", whatsappErr.message);
          }
        }
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
