import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Build WhatsApp reminder message
function buildReminderMessage(tenantName: string, roomNo: string, amount: number, dueDate: string) {
  const formattedAmount = `₹${amount.toLocaleString("en-IN")}`;
  return encodeURIComponent(
    `🏢 *ATUL RESIDENCY - RENT REMINDER*\n\n` +
    `Hello *${tenantName}*! 👋\n\n` +
    `This is a friendly reminder that your rent is due soon.\n\n` +
    `📍 *Room:* ${roomNo}\n` +
    `💰 *Amount Due:* ${formattedAmount}\n` +
    `📅 *Due Date:* ${dueDate}\n\n` +
    `Please pay via UPI:\n` +
    `💳 *UPI ID:* atultiwari123321@oksbi\n\n` +
    `After payment, please upload the screenshot in the Atul Residency app.\n\n` +
    `Thank you! 🙏\n` +
    `— Atul Residency Management`
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId, rentRecordId } = await req.json();

    // Fetch tenants who have pending/overdue rent
    let tenants: any[] = [];

    if (tenantId) {
      // Single tenant reminder
      const t = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          room: { include: { tower: true } },
          rentRecords: {
            where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      if (t) tenants = [t];
    } else {
      // All tenants with pending rent
      tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        include: {
          room: { include: { tower: true } },
          rentRecords: {
            where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
    }

    const reminders = tenants
      .filter((t) => t.rentRecords.length > 0)
      .map((t) => {
        const rec = t.rentRecords[0];
        const phone = (t.whatsapp || t.phone).replace(/\D/g, "");
        const wa = phone.startsWith("91") ? phone : `91${phone}`;
        const dueDate = new Date(rec.dueDate).toLocaleDateString("en-IN", {
          day: "numeric", month: "long", year: "numeric",
        });
        const roomNo = `${t.room?.number || "—"} ${t.room?.tower?.name || ""}`.trim();
        const message = buildReminderMessage(t.name, roomNo, rec.totalAmount - rec.amountPaid, dueDate);

        return {
          tenantId: t.id,
          name: t.name,
          phone: wa,
          whatsappUrl: `https://wa.me/${wa}?text=${message}`,
          amount: rec.totalAmount - rec.amountPaid,
          dueDate,
          roomNo,
        };
      });

    // Mark reminders sent in DB
    if (reminders.length > 0) {
      for (const t of tenants) {
        if (t.rentRecords.length > 0) {
          await prisma.rentRecord.update({
            where: { id: t.rentRecords[0].id },
            data: { reminderSent: true },
          });
        }
      }
    }

    return NextResponse.json({ success: true, reminders });
  } catch (err) {
    console.error("[send-reminders]", err);
    return NextResponse.json({ error: "Failed to generate reminders" }, { status: 500 });
  }
}

// GET: Check who needs a reminder (due within 48 hours or overdue)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const in48hrs = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const overdueOrDueSoon = await prisma.rentRecord.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
        dueDate: { lte: in48hrs },
      },
      include: {
        tenant: {
          include: { room: { include: { tower: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json(overdueOrDueSoon);
  } catch {
    return NextResponse.json({ error: "Failed to check reminders" }, { status: 500 });
  }
}
