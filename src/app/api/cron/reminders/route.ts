import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check for authorization header if you want to secure this endpoint
    // In production, you'd use a secret token from a cron service like Vercel Cron
    const authHeader = req.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all rent records that are OVERDUE or PENDING where the due date was exactly 2 days ago
    const today = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);
    
    // We want to match records whose due date falls on the day of `twoDaysAgo`
    const startOfDay = new Date(twoDaysAgo.setHours(0, 0, 0, 0));
    const endOfDay = new Date(twoDaysAgo.setHours(23, 59, 59, 999));

    const records = await prisma.rentRecord.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] },
        reminderSent: false,
        dueDate: {
          gte: startOfDay,
          lte: endOfDay,
        }
      },
      include: {
        tenant: true
      }
    });

    let sentCount = 0;

    for (const record of records) {
      if (!record.tenant || !record.tenant.whatsapp) continue;

      const tenant = record.tenant;
      const amountDue = record.totalAmount - record.amountPaid;
      
      const message = `🔔 *Rent Reminder - Atul Residency*\n\nHi ${tenant.name},\nThis is an automated reminder that your rent of ₹${amountDue.toLocaleString('en-IN')} for ${new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} was due 48 hours ago.\n\nPlease pay at your earliest convenience to avoid late fees. Let us know if you've already paid.`;

      try {
        await prisma.whatsappQueue.create({
          data: {
            number: tenant.whatsapp,
            message: message,
            status: "PENDING"
          }
        });

        // Mark as reminder sent
        await prisma.rentRecord.update({
          where: { id: record.id },
          data: { reminderSent: true }
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to queue WhatsApp to ${tenant.name}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${records.length} records. Sent ${sentCount} reminders.` 
    });

  } catch (error) {
    console.error("Cron Reminder Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
