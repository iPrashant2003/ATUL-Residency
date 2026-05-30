import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";
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
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    const records = await prisma.rentRecord.findMany({
      where: {
        ...(month && { month: parseInt(month) }),
        ...(year && { year: parseInt(year) }),
        ...(tenantId && { tenantId }),
        ...(status && { status: status as any }),
      },
      include: {
        tenant: {
          include: {
            room: { include: { tower: true } },
          },
        },
        payments: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rent records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      tenantId, month, year,
      rentAmount, electricityBill, meterReading, meterPhotoUrl, maintenanceCharge, lateFee, discount, notes,
    } = await req.json();

    if (!tenantId || !month || !year || !rentAmount) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const total =
      parseFloat(rentAmount) +
      parseFloat(electricityBill || 0) +
      parseFloat(maintenanceCharge || 0) +
      parseFloat(lateFee || 0) -
      parseFloat(discount || 0);

    const dueDate = new Date(year, month - 1, 10); // Due on 10th

    const record = await prisma.rentRecord.upsert({
      where: { tenantId_month_year: { tenantId, month: parseInt(month), year: parseInt(year) } },
      update: {
        rentAmount: parseFloat(rentAmount),
        electricityBill: parseFloat(electricityBill || 0),
        meterReading: meterReading || null,
        ...(meterPhotoUrl && { meterPhotoUrl }),
        maintenanceCharge: parseFloat(maintenanceCharge || 0),
        lateFee: parseFloat(lateFee || 0),
        discount: parseFloat(discount || 0),
        totalAmount: total,
        notes,
      },
      create: {
        tenantId,
        month: parseInt(month),
        year: parseInt(year),
        rentAmount: parseFloat(rentAmount),
        electricityBill: parseFloat(electricityBill || 0),
        meterReading: meterReading || null,
        meterPhotoUrl: meterPhotoUrl || null,
        maintenanceCharge: parseFloat(maintenanceCharge || 0),
        lateFee: parseFloat(lateFee || 0),
        discount: parseFloat(discount || 0),
        totalAmount: total,
        dueDate,
        status: "PENDING",
        notes,
      },
      include: {
        tenant: { include: { room: { include: { tower: true } } } },
      },
    });

    // Trigger notifications & reminders immediately to pay rent (Portal + WhatsApp with QR + PWA Push)
    if (record.tenant && record.tenant.userId) {
      try {
        const tenant = record.tenant;
        const balance = record.totalAmount - record.amountPaid;
        const monthName = new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long' });

        const host = req.headers.get("host") || "localhost:3000";
        let invoiceUrl = "";
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          const lanIp = getLanIp();
          const port = host.split(":")[1] || "3000";
          invoiceUrl = `http://${lanIp}:${port}/api/rent/${record.id}/invoice`;
        } else {
          invoiceUrl = `https://${host}/api/rent/${record.id}/invoice`;
        }

        // Generate detailed billing breakdown
        let breakdown = `🏠 *Rent*: ${formatCurrency(record.rentAmount)}\n`;
        if (record.electricityBill > 0) breakdown += `⚡ *Electricity Bill*: ${formatCurrency(record.electricityBill)}\n`;
        if (record.maintenanceCharge > 0) breakdown += `🔧 *Maintenance*: ${formatCurrency(record.maintenanceCharge)}\n`;
        if (record.lateFee > 0) breakdown += `⏳ *Late Fee*: ${formatCurrency(record.lateFee)}\n`;
        if (record.discount > 0) breakdown += `🎁 *Discount*: -${formatCurrency(record.discount)}\n`;

        // Generate UPI QR Code image
        const upiString = `upi://pay?pa=atultiwari123321@oksbi&pn=ATUL%20RESIDENCY&am=${balance}&cu=INR`;
        let qrDataUri = null;
        try {
          const QRCode = await import("qrcode");
          qrDataUri = await QRCode.toDataURL(upiString, { width: 400, margin: 2, color: { dark: '#0f172a' } });
        } catch (qrErr) {
          console.error("Failed to generate UPI QR code for immediate invoice:", qrErr);
        }

        // Queue premium WhatsApp message
        if (tenant.whatsapp) {
          const whatsappMsg = `✨ *ATUL RESIDENCY* ✨\n🏢 *A Symbol of Luxury Living*\n\nDear *${tenant.name}*,\n\nYour detailed rent & utility invoice for *${monthName} ${record.year}* has been generated. 🧾\n\n🏠 *Room*: ${tenant.room?.number || "—"} (${tenant.room?.tower?.name || ""})\n-------------------------------\n${breakdown}-------------------------------\n💰 *Total Due*: *${formatCurrency(record.totalAmount)}*\n-------------------------------\n\n💳 *Please pay via UPI*: atultiwari123321@oksbi\n*(Scan the QR code below to pay instantly)*\n\n📄 *View/Download PDF Invoice & Pay instantly*:\n${invoiceUrl}\n\n💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\nWarm regards,\n*Atul Tiwari*\nAtul Residency`;

          await prisma.whatsappQueue.create({
            data: {
              number: tenant.whatsapp,
              message: whatsappMsg,
              mediaBase64: qrDataUri,
              status: "PENDING",
            }
          });
          console.log(`Auto-queued immediate WhatsApp Rent Invoice for ${tenant.name}`);
        }

        // Create Portal Notification
        await prisma.notification.create({
          data: {
            userId: tenant.userId,
            type: "RENT_DUE",
            title: "Rent Bill Generated 🏢",
            message: `Dear ${tenant.name}, your rent & utilities invoice of ₹${record.totalAmount} for ${monthName} ${record.year} is generated. Please pay on your portal or via UPI. Atul Residency.`
          }
        });

        // Trigger PWA Push Notification
        await sendPushNotification(
          tenant.userId,
          "Rent Invoice Generated 🏢",
          `Hi ${tenant.name}, your rent invoice for ${monthName} ${record.year} of ₹${balance.toLocaleString('en-IN')} has been generated. Tap to view and pay instantly.`,
          `/tenant/payments`
        ).catch(e => console.error("Push notify error:", e));

      } catch (err: any) {
        console.error("Failed to process immediate billing notifications:", err.message);
      }
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create rent record" }, { status: 500 });
  }
}
