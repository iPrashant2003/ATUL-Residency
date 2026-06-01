import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting manual database backup requested by admin...");

    const backupData: Record<string, any> = {
      timestamp: new Date().toISOString(),
      source: "manual-backup",
      tables: {} as Record<string, any[]>,
    };

    const tables = backupData.tables;

    tables.User = await prisma.user.findMany();
    tables.Tower = await prisma.tower.findMany();
    tables.Room = await prisma.room.findMany();
    tables.Tenant = await prisma.tenant.findMany();
    tables.RentRecord = await prisma.rentRecord.findMany();
    tables.Payment = await prisma.payment.findMany();
    tables.MaintenanceRequest = await prisma.maintenanceRequest.findMany();
    tables.Notification = await prisma.notification.findMany();
    tables.Document = await prisma.document.findMany();
    tables.ActivityLog = await prisma.activityLog.findMany();
    tables.OtpCode = await prisma.otpCode.findMany();
    tables.WhatsappQueue = await prisma.whatsappQueue.findMany();
    tables.PushSubscription = await prisma.pushSubscription.findMany();

    const totalRows = Object.values(tables).reduce(
      (sum: number, rows) => sum + (rows as any[]).length,
      0
    );

    // Email configuration
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || "atultiwari123321@gmail.com";
    const adminEmail2 = process.env.ADMIN_EMAIL_2 || "prashantmanitripathi2003@gmail.com";

    let emailSent = false;
    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: smtpUser, pass: smtpPass },
      });

      const dateStr = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const fileName = `manual-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

      await transporter.sendMail({
        from: `"Atul Residency Manual Backup" <${smtpUser}>`,
        to: `${adminEmail}, ${adminEmail2}`,
        subject: `💾 Manual Backup Sync - ${dateStr} | ${totalRows} rows`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #fafafa;">
            <h2 style="color: #14B8A6; margin-top: 0;">💾 Manual Database Backup Sync</h2>
            <p>A manual database backup was successfully triggered from your Admin Settings portal.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="background: #f1f5f9;"><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Triggered By</strong></td><td style="padding: 10px; border: 1px solid #e2e8f0;">${session.user?.name || "Admin"} (${session.user?.email})</td></tr>
              <tr><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Time (IST)</strong></td><td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date().toLocaleString("en-IN")}</td></tr>
              <tr style="background: #f1f5f9;"><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Total Row Count</strong></td><td style="padding: 10px; border: 1px solid #e2e8f0;">${totalRows} rows</td></tr>
              <tr><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Active Tenants</strong></td><td style="padding: 10px; border: 1px solid #e2e8f0;">${tables.Tenant.length}</td></tr>
              <tr style="background: #f1f5f9;"><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Payments Tracked</strong></td><td style="padding: 10px; border: 1px solid #e2e8f0;">${tables.Payment.length}</td></tr>
            </table>
            <p style="color: #475569; font-size: 13px; line-height: 1.5;">This backup JSON has been attached. Keep this email safe. You can use it to restore the entire residency database anytime by running <code>npm run db:restore path/to/file.json</code> locally.</p>
          </div>
        `,
        attachments: [
          {
            filename: fileName,
            content: JSON.stringify(backupData, null, 2),
            contentType: "application/json",
          },
        ],
      });
      emailSent = true;
    }

    return NextResponse.json({
      success: true,
      timestamp: backupData.timestamp,
      totalRows,
      emailSent,
      tablesCount: Object.fromEntries(
        Object.entries(tables).map(([k, v]) => [k, (v as any[]).length])
      ),
    });
  } catch (error) {
    console.error("❌ Manual backup API failed:", error);
    return NextResponse.json(
      { error: "Backup failed", details: String(error) },
      { status: 500 }
    );
  }
}
