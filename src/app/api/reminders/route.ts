import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getMonthName } from "@/lib/utils";
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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, rentRecordId, month, year } = await req.json();

    if (type === "single" && rentRecordId) {
      // Fetch specific record
      const record = await prisma.rentRecord.findUnique({
        where: { id: rentRecordId },
        include: { tenant: true },
      });

      if (!record || !record.tenant.whatsapp) {
        return NextResponse.json({ error: "Record or WhatsApp not found" }, { status: 400 });
      }

      const balance = record.totalAmount - record.amountPaid;
      
      const host = req.headers.get("host") || "localhost:3000";
      let invoiceUrl;
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        const lanIp = getLanIp();
        const port = host.split(":")[1] || "3000";
        invoiceUrl = `http://${lanIp}:${port}/api/rent/${record.id}/invoice`;
      } else {
        const proto = req.headers.get("x-forwarded-proto") || "http";
        invoiceUrl = `${proto}://${host}/api/rent/${record.id}/invoice`;
      }

      let breakdown = `🏠 *Rent*: ₹${record.rentAmount}\n`;
      if (record.electricityBill > 0) breakdown += `⚡ *Electricity Bill*: ₹${record.electricityBill}\n`;
      if (record.maintenanceCharge > 0) breakdown += `🔧 *Maintenance*: ₹${record.maintenanceCharge}\n`;
      if (record.lateFee > 0) breakdown += `⏳ *Late Fee*: ₹${record.lateFee}\n`;
      if (record.discount > 0) breakdown += `🎁 *Discount*: -₹${record.discount}\n`;

      const msg = `🏢 *ATUL RESIDENCY* 🏢\n\n👤 Dear *${record.tenant.name}*,\n\nHere is your detailed rent invoice for *${getMonthName(record.month)} ${record.year}*.\n\n${breakdown}-------------------------------\n💰 *Total Due*: ₹${balance.toLocaleString('en-IN')}\n-------------------------------\n\n⚠️ *Please Pay on time!* ⚠️\n\n📄 *View & Download PDF Invoice*:\n${invoiceUrl}\n\n💳 *Please pay via UPI*: atultiwari123321@oksbi\n*(Scan the QR code below to pay instantly)*\n\n💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\n🙏 Thank you!`;
      
      const upiString = `upi://pay?pa=atultiwari123321@oksbi&pn=ATUL%20RESIDENCY&am=${balance}&cu=INR`;
      const qrDataUri = await QRCode.toDataURL(upiString, { width: 400, margin: 2, color: { dark: '#0f172a' } });

      try {
        await prisma.whatsappQueue.create({
          data: {
            number: record.tenant.whatsapp,
            message: msg,
            mediaBase64: qrDataUri,
            status: "PENDING",
          }
        });

        await prisma.rentRecord.update({
          where: { id: record.id },
          data: { lastReminderSentAt: new Date() }
        });
        return NextResponse.json({ success: true });
      } catch (err) {
        return NextResponse.json({ error: "Failed to queue WhatsApp message" }, { status: 500 });
      }
    } else if (type === "bulk") {
      // Find all overdue or pending records, optionally filtered by month/year
      const records = await prisma.rentRecord.findMany({
        where: { 
          status: { in: ["OVERDUE", "PENDING"] },
          ...(month && { month: parseInt(month) }),
          ...(year && { year: parseInt(year) })
        },
        include: { tenant: true },
      });

      if (records.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }

      let count = 0;
      for (const record of records) {
        if (!record.tenant.whatsapp) continue;
        const balance = record.totalAmount - record.amountPaid;

        const host = req.headers.get("host") || "localhost:3000";
        let invoiceUrl;
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          const lanIp = getLanIp();
          const port = host.split(":")[1] || "3000";
          invoiceUrl = `http://${lanIp}:${port}/api/rent/${record.id}/invoice`;
        } else {
          const proto = req.headers.get("x-forwarded-proto") || "http";
          invoiceUrl = `${proto}://${host}/api/rent/${record.id}/invoice`;
        }

        let breakdown = `🏠 *Rent*: ₹${record.rentAmount}\n`;
        if (record.electricityBill > 0) breakdown += `⚡ *Electricity Bill*: ₹${record.electricityBill}\n`;
        if (record.maintenanceCharge > 0) breakdown += `🔧 *Maintenance*: ₹${record.maintenanceCharge}\n`;
        if (record.lateFee > 0) breakdown += `⏳ *Late Fee*: ₹${record.lateFee}\n`;
        if (record.discount > 0) breakdown += `🎁 *Discount*: -₹${record.discount}\n`;

        const msg = `🏢 *ATUL RESIDENCY* 🏢\n\n👤 Dear *${record.tenant.name}*,\n\nHere is your detailed rent invoice for *${getMonthName(record.month)} ${record.year}*.\n\n${breakdown}-------------------------------\n💰 *Total Due*: ₹${balance.toLocaleString('en-IN')}\n-------------------------------\n\n⚠️ *Please Pay on time!* ⚠️\n\n📄 *View & Download PDF Invoice*:\n${invoiceUrl}\n\n💳 *Please pay via UPI*: atultiwari123321@oksbi\n*(Scan the QR code below to pay instantly)*\n\n💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\n🙏 Thank you!`;

        const upiString = `upi://pay?pa=atultiwari123321@oksbi&pn=ATUL%20RESIDENCY&am=${balance}&cu=INR`;
        const qrDataUri = await QRCode.toDataURL(upiString, { width: 400, margin: 2, color: { dark: '#0f172a' } });

        try {
          await prisma.whatsappQueue.create({
            data: {
              number: record.tenant.whatsapp,
              message: msg,
              mediaBase64: qrDataUri,
              status: "PENDING",
            }
          });

          await prisma.rentRecord.update({
            where: { id: record.id },
            data: { lastReminderSentAt: new Date() }
          });
          count++;
        } catch (err: any) {
          console.error("Bulk reminder queue failed for", record.tenant.name, err.message);
        }
      }

      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[Reminders API Error]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
