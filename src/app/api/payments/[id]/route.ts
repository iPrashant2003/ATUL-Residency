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

    // If approved
    if (status === "APPROVED") {
      const tenant = payment.tenant;
      
      // Send Portal Notification to the tenant
      if (tenant) {
        try {
          await prisma.notification.create({
            data: {
              userId: tenant.userId,
              type: "PAYMENT_APPROVED",
              title: "Payment Approved! 🎉",
              message: `Dear ${tenant.name}, your payment of ₹${payment.amount} has been approved. Thanking you for payments: Atul Residency. We appreciate your residency!`
            }
          });
        } catch (notifErr) {
          console.error("Failed to create payment approval portal notification:", notifErr);
        }
      }

      if (payment.rentRecordId) {
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
            include: { tenant: { include: { room: { include: { tower: true } } } } }
          });

          // Queue WhatsApp message with creative thank you greeting and PDF link
          if (updatedRentRecord.tenant && updatedRentRecord.tenant.whatsapp) {
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

              const isPaid = newStatus === "PAID";
              const whatsappMsg = `✨ *ATUL RESIDENCY* ✨\n👑 *Thank You For Your Payment* 👑\n\nDear *${tenant.name}*,\n\nWe have successfully received and approved your payment of *${formatCurrency(payment.amount)}*! 💰\n\n🏠 *Room*: ${tenant.room?.number || "—"} (${tenant.room?.tower?.name || ""})\n🗓️ *Billing Period*: ${monthName} ${record.year}\n${isPaid ? `✅ *Overall Status*: PAID / Verified\n` : `⏳ *Overall Status*: PARTIALLY PAID\n`}\n${breakdown}-------------------------------\n💰 *Total Paid This Month*: ${formatCurrency(newAmountPaid)} / ${formatCurrency(record.totalAmount)}\n-------------------------------\n\n📄 *View & Download PDF ${isPaid ? "Receipt" : "Invoice"}*:\n${invoiceUrl}\n\nThanking you for payments: Atul Residency. We are committed to providing you with a premium, worry-free living experience. 🌟\n\nWarm regards,\n*Atul Tiwari*\nAtul Residency`;

              await prisma.whatsappQueue.create({
                data: {
                  number: tenant.whatsapp,
                  message: whatsappMsg,
                  status: "PENDING",
                }
              });
              console.log(`Auto-queued WhatsApp Payment Approval Greeting for ${tenant.name}`);
            } catch (whatsappErr: any) {
              console.error("Failed to auto-queue WhatsApp payment approval greeting:", whatsappErr.message);
            }
          }
        }
      } else if (tenant && tenant.whatsapp) {
        // Payment approved but not linked to specific rent record
        try {
          const whatsappMsg = `✨ *ATUL RESIDENCY* ✨\n👑 *Thank You For Your Payment* 👑\n\nDear *${tenant.name}*,\n\nWe have successfully received and approved your payment of *${formatCurrency(payment.amount)}*! 💰\n\n🏠 *Room*: ${tenant.room?.number || "—"} (${tenant.room?.tower?.name || ""})\n\nThanking you for payments: Atul Residency. We are committed to providing you with a premium, worry-free living experience. 🌟\n\nWarm regards,\n*Atul Tiwari*\nAtul Residency`;

          await prisma.whatsappQueue.create({
            data: {
              number: tenant.whatsapp,
              message: whatsappMsg,
              status: "PENDING",
            }
          });
        } catch (whatsappErr: any) {
          console.error("Failed to auto-queue WhatsApp general payment approval:", whatsappErr.message);
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

// Delete payment and adjust rent record if approved
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch payment details first
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        tenant: { include: { user: true } },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Begin database transaction to ensure atomic deletion & adjustment
    await prisma.$transaction(async (tx) => {
      // 1. If payment was approved, adjust the associated RentRecord
      if (payment.status === "APPROVED" && payment.rentRecordId) {
        const rentRecord = await tx.rentRecord.findUnique({
          where: { id: payment.rentRecordId },
        });

        if (rentRecord) {
          const newAmountPaid = Math.max(0, rentRecord.amountPaid - payment.amount);
          const newStatus = newAmountPaid === 0 
            ? "PENDING" 
            : newAmountPaid >= rentRecord.totalAmount 
              ? "PAID" 
              : "PARTIAL";

          await tx.rentRecord.update({
            where: { id: payment.rentRecordId },
            data: {
              amountPaid: newAmountPaid,
              status: newStatus,
              paidDate: newStatus === "PAID" ? rentRecord.paidDate : null,
            },
          });
        }
      }

      // 2. Delete the payment
      await tx.payment.delete({
        where: { id },
      });
    });

    // 3. Send WhatsApp message to tenant
    if (payment.tenant && payment.tenant.whatsapp) {
      try {
        const tenantName = payment.tenant.name;
        const amountStr = payment.amount.toLocaleString('en-IN');
        
        const whatsappMsg = `⚠️ *ATUL RESIDENCY - PAYMENT DELETED* ⚠️\n\nDear *${tenantName}*,\n\nYour submitted payment of *₹${amountStr}* has been deleted by the admin.\n\n📝 Please submit your payment details again on the portal, or contact the owner if you have questions.\n\nWarm regards,\n*Atul Tiwari*\nAtul Residency`;

        await prisma.whatsappQueue.create({
          data: {
            number: payment.tenant.whatsapp,
            message: whatsappMsg,
            status: "PENDING",
          },
        });
        console.log(`Queued payment deletion notification for ${tenantName}`);
      } catch (err: any) {
        console.error("Failed to queue deletion WhatsApp message:", err.message);
      }
    }

    // 4. Trigger PWA Push Notification if possible
    if (payment.tenant && payment.tenant.userId) {
      await sendPushNotification(
        payment.tenant.userId,
        "Payment Deleted ⚠️",
        `Your payment of ₹${payment.amount.toLocaleString('en-IN')} has been deleted. Please submit again.`,
        "/tenant/payments"
      ).catch(e => console.error("Push notify error on delete:", e));
    }

    return NextResponse.json({ success: true, message: "Payment deleted successfully." });
  } catch (error: any) {
    console.error("Failed to delete payment:", error);
    return NextResponse.json({ error: error.message || "Failed to delete payment" }, { status: 500 });
  }
}
