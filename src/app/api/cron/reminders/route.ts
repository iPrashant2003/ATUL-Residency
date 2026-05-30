import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Auto-update status to OVERDUE for unpaid bills after the 5th
    // ─────────────────────────────────────────────────────────────────────────
    // We match any PENDING or PARTIAL record where either:
    // - The year is in the past
    // - The year is current, but month is in the past
    // - The year is current, month is current, but day is > 5
    if (currentDay > 5) {
      await prisma.rentRecord.updateMany({
        where: {
          status: { in: ["PENDING", "PARTIAL"] },
          OR: [
            { year: { lt: currentYear } },
            { AND: [{ year: currentYear }, { month: { lte: currentMonth } }] }
          ]
        },
        data: {
          status: "OVERDUE"
        }
      });
    } else {
      // If we are <= 5th, older months are still overdue
      await prisma.rentRecord.updateMany({
        where: {
          status: { in: ["PENDING", "PARTIAL"] },
          OR: [
            { year: { lt: currentYear } },
            { AND: [{ year: currentYear }, { month: { lt: currentMonth } }] }
          ]
        },
        data: {
          status: "OVERDUE"
        }
      });
    }

    let remindersSent = 0;
    const host = req.headers.get("host") || "localhost:3000";

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: On the 1st of every month, send a friendly "Rent Due" reminder
    // ─────────────────────────────────────────────────────────────────────────
    if (currentDay === 1) {
      // Find all records for current month/year that are PENDING or PARTIAL,
      // and haven't had a reminder sent TODAY
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const dueRecords = await prisma.rentRecord.findMany({
        where: {
          month: currentMonth,
          year: currentYear,
          status: { in: ["PENDING", "PARTIAL"] },
          OR: [
            { lastReminderSentAt: null },
            { lastReminderSentAt: { lt: startOfToday } }
          ]
        },
        include: {
          tenant: { include: { room: { include: { tower: true } } } }
        }
      });

      for (const record of dueRecords) {
        if (!record.tenant || !record.tenant.whatsapp) continue;

        const tenant = record.tenant;
        const balance = record.totalAmount - record.amountPaid;
        const monthName = MONTH_NAMES[record.month - 1] || "Billing Month";

        let invoiceUrl = "";
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          const lanIp = getLanIp();
          const port = host.split(":")[1] || "3000";
          invoiceUrl = `http://${lanIp}:${port}/api/rent/${record.id}/invoice`;
        } else {
          invoiceUrl = `https://${host}/api/rent/${record.id}/invoice`;
        }

        // WhatsApp announcement
        const whatsappMsg = `✨ *ATUL RESIDENCY* ✨\n🏢 *Monthly Rent Announcement*\n\nDear *${tenant.name}*,\n\nWe hope you are having a wonderful start to the month! 🗓️\n\nThis is a reminder that the rent invoice for *${monthName} ${record.year}* is now active and due for payment.\n\n🏠 *Room*: ${tenant.room?.number || "—"} (${tenant.room?.tower?.name || ""})\n💰 *Total Amount*: *${formatCurrency(record.totalAmount)}*\n\n💳 *UPI ID*: atultiwari123321@oksbi\n📄 *Portal Link*: ${invoiceUrl}\n\nPlease complete your payment before the 5th of the month to maintain your active status. Thank you! 🙏\n\nWarm regards,\n*Atul Tiwari*\nAtul Residency`;

        await prisma.whatsappQueue.create({
          data: {
            number: tenant.whatsapp,
            message: whatsappMsg,
            status: "PENDING"
          }
        });

        // Portal Notification
        await prisma.notification.create({
          data: {
            userId: tenant.userId,
            type: "RENT_DUE",
            title: "Monthly Rent Invoice Active 🗓️",
            message: `Dear ${tenant.name}, your rent & utilities invoice of ₹${record.totalAmount} for ${monthName} is now active. Please pay before the 5th. Atul Residency.`
          }
        });

        // Update record
        await prisma.rentRecord.update({
          where: { id: record.id },
          data: { lastReminderSentAt: new Date() }
        });

        remindersSent++;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: After the 5th, send OVERDUE reminders on WhatsApp & Portal every 48 hours
    // ─────────────────────────────────────────────────────────────────────────
    // Find all rent records in OVERDUE status where lastReminderSentAt is null
    // or older than 48 hours (we use 47 hours to allow slight cron invocation offsets)
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - 47);

    const overdueRecords = await prisma.rentRecord.findMany({
      where: {
        status: "OVERDUE",
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lte: thresholdDate } }
        ]
      },
      include: {
        tenant: { include: { room: { include: { tower: true } } } }
      }
    });

    for (const record of overdueRecords) {
      if (!record.tenant || !record.tenant.whatsapp) continue;

      const tenant = record.tenant;
      const balance = record.totalAmount - record.amountPaid;
      const monthName = MONTH_NAMES[record.month - 1] || "Billing Month";

      let invoiceUrl = "";
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        const lanIp = getLanIp();
        const port = host.split(":")[1] || "3000";
        invoiceUrl = `http://${lanIp}:${port}/api/rent/${record.id}/invoice`;
      } else {
        invoiceUrl = `https://${host}/api/rent/${record.id}/invoice`;
      }

      // Generate UPI QR code for the balance
      const upiString = `upi://pay?pa=atultiwari123321@oksbi&pn=ATUL%20RESIDENCY&am=${balance}&cu=INR`;
      let qrDataUri = null;
      try {
        qrDataUri = await QRCode.toDataURL(upiString, { width: 400, margin: 2, color: { dark: '#0f172a' } });
      } catch (qrErr) {
        console.error("QR generation error in cron:", qrErr);
      }

      // Premium WhatsApp reminder
      const whatsappMsg = `⚠️ *ATUL RESIDENCY - OVERDUE NOTICE* ⚠️\n🚨 *Action Required*\n\nDear *${tenant.name}*,\n\nThis is a reminder that your rent & utility payment for *${monthName} ${record.year}* is now *OVERDUE*. ⏳\n\n🏠 *Room*: ${tenant.room?.number || "—"} (${tenant.room?.tower?.name || ""})\n💰 *Pending Balance*: *${formatCurrency(balance)}*\n🚨 *Status*: OVERDUE\n\nPlease pay immediately via your resident portal or UPI to prevent any interruption of services or additional late fees.\n\n💳 *UPI ID*: atultiwari123321@oksbi\n*(Scan the QR code below to pay instantly)*\n\n📄 *View Details & Pay*:\n${invoiceUrl}\n\nIf you have already paid, please upload your receipt screenshot on the portal or ignore this message.\n\nThank you,\n*Atul Residency Management*`;

      await prisma.whatsappQueue.create({
        data: {
          number: tenant.whatsapp,
          message: whatsappMsg,
          mediaBase64: qrDataUri,
          status: "PENDING"
        }
      });

      // Portal Notification
      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "RENT_OVERDUE",
          title: "Rent Overdue Alert! ⚠️",
          message: `Dear ${tenant.name}, your rent payment for ${monthName} is overdue. Outstanding balance: ₹${balance}. Please pay immediately to prevent late fees. Atul Residency.`
        }
      });

      // Update record
      await prisma.rentRecord.update({
        where: { id: record.id },
        data: { lastReminderSentAt: new Date() }
      });

      remindersSent++;
    }

    return NextResponse.json({
      success: true,
      message: `Cron job run successful. Sent ${remindersSent} reminders.`
    });

  } catch (error: any) {
    console.error("Cron Reminder Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
