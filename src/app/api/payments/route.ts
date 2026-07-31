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
    let { tenantId, rentRecordId, amount, method, transactionId, screenshotUrl, notes } = await req.json();

    if (!tenantId && rentRecordId) {
      const rec = await prisma.rentRecord.findUnique({ where: { id: rentRecordId } });
      if (rec) {
        tenantId = rec.tenantId;
        if (!amount) {
          amount = rec.totalAmount - rec.amountPaid;
        }
      }
    }

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

      // Send push notification to all admins
      for (const admin of admins) {
        await sendPushNotification(
          admin.id,
          `Payment Received from ${tenant?.name} 💰`,
          `Room ${roomNo} (${towerName}) paid ₹${parseFloat(amount).toLocaleString("en-IN")} via ${method || "UPI"}. Tap to verify.`,
          `/admin/payments`
        ).catch(e => console.error("Admin payment push error:", e));
      }
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
    let newStatus = "";
    let newAmountPaid = 0;
    let updatedRentRecord: any = null;

    if (recId) {
      const rec = await prisma.rentRecord.findUnique({ where: { id: recId } });
      if (rec) {
        newAmountPaid = rec.amountPaid;
        
        if (previousPayment.status !== "APPROVED" && status === "APPROVED") {
          newAmountPaid += payment.amount;
        } else if (previousPayment.status === "APPROVED" && status !== "APPROVED") {
          newAmountPaid = Math.max(0, newAmountPaid - payment.amount);
        }

        newStatus = newAmountPaid >= rec.totalAmount ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : "PENDING";
        
        updatedRentRecord = await prisma.rentRecord.update({
          where: { id: recId },
          data: { 
            amountPaid: newAmountPaid, 
            status: newStatus as any, 
            paidDate: newStatus === "PAID" ? new Date() : (newAmountPaid === 0 ? null : rec.paidDate) 
          },
          include: { tenant: { include: { room: { include: { tower: true } } } } }
        });
      }
    }

    // Notify the tenant in a premium, creative manner (WhatsApp & Portal)
    if (payment.tenant) {
      const tenant = payment.tenant;
      if (status === "APPROVED" && previousPayment.status !== "APPROVED") {
        // Portal Notification
        try {
          await prisma.notification.create({
            data: {
              userId: tenant.userId,
              type: "PAYMENT_APPROVED",
              title: "Payment Approved! 🎉",
              message: `Dear ${tenant.name}, your payment of ₹${payment.amount.toLocaleString("en-IN")} has been approved. Thanking you for payments: Atul Residency. We appreciate your residency!`
            }
          });
        } catch (notifErr) {
          console.error("Failed to create payment approval portal notification:", notifErr);
        }

        // WhatsApp message
        if (updatedRentRecord && updatedRentRecord.tenant && updatedRentRecord.tenant.whatsapp) {
          try {
            const record = updatedRentRecord;
            const t = updatedRentRecord.tenant;
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
            const whatsappMsg = `✨ *ATUL RESIDENCY* ✨\n👑 *Thank You For Your Payment* 👑\n\nDear *${t.name}*,\n\nWe have successfully received and approved your payment of *${formatCurrency(payment.amount)}*! 💰\n\n🏠 *Room*: ${t.room?.number || "—"} (${t.room?.tower?.name || ""})\n🗓️ *Billing Period*: ${monthName} ${record.year}\n${isPaid ? `✅ *Overall Status*: PAID / Verified\n` : `⏳ *Overall Status*: PARTIALLY PAID\n`}\n${breakdown}-------------------------------\n💰 *Total Paid This Month*: ${formatCurrency(newAmountPaid)} / ${formatCurrency(record.totalAmount)}\n-------------------------------\n\n📄 *View & Download PDF ${isPaid ? "Receipt" : "Invoice"}*:\n${invoiceUrl}\n\nThanking you for payments: Atul Residency. We are committed to providing you with a premium, worry-free living experience. 🌟\n\nWarm regards,\n*Atul Tiwari*\nAtul Residency`;

            await prisma.whatsappQueue.create({
              data: {
                number: t.whatsapp,
                message: whatsappMsg,
                status: "PENDING",
              }
            });
            console.log(`Auto-queued WhatsApp Payment Approval Greeting for ${t.name}`);
          } catch (whatsappErr: any) {
            console.error("Failed to auto-queue WhatsApp payment approval greeting:", whatsappErr.message);
          }
        } else if (tenant.whatsapp) {
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
      } else if (status !== "APPROVED") {
        // Handle rejection or marking unpaid
        try {
          await prisma.notification.create({
            data: {
              userId: tenant.userId,
              type: "GENERAL",
              title: "Payment Rejected ❌",
              message: `Your payment of ₹${payment.amount.toLocaleString("en-IN")} was not approved. Please contact the admin.`
            }
          });
        } catch (notifErr) {
          console.error("Failed to create payment rejection portal notification:", notifErr);
        }
      }

      // Trigger PWA Push Notification to the tenant about payment status
      if (tenant.userId) {
        try {
          const isApproved = status === "APPROVED";
          const messageTitle = isApproved ? "Payment Approved! 🎉" : "Payment Rejected ⚠️";
          const messageBody = isApproved
            ? `Hi ${tenant.name}, your payment of ₹${payment.amount.toLocaleString('en-IN')} has been approved. Thank you!`
            : `Hi ${tenant.name}, your payment of ₹${payment.amount.toLocaleString('en-IN')} was not approved. Please verify details.`;

          await sendPushNotification(
            tenant.userId,
            messageTitle,
            messageBody,
            "/tenant/payments"
          );
        } catch (pushErr) {
          console.error("Push notify error in payments route:", pushErr);
        }
      }
    }

    return NextResponse.json(payment);
  } catch (err) {
    console.error("[payment PATCH]", err);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
