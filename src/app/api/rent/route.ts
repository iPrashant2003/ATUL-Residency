import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";
import { sendPushNotification } from "@/lib/push";

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

    // Trigger PWA Push Notification to the tenant
    if (record.tenant && record.tenant.userId) {
      const balance = record.totalAmount - record.amountPaid;
      const monthName = new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long' });
      
      await sendPushNotification(
        record.tenant.userId,
        "Rent Invoice Generated 🏢",
        `Hi ${record.tenant.name}, your rent invoice for ${monthName} ${record.year} of ₹${balance.toLocaleString('en-IN')} has been generated. Tap to view and pay instantly.`,
        `/tenant/payments`
      ).catch(e => console.error("Push notify error:", e));
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create rent record" }, { status: 500 });
  }
}
