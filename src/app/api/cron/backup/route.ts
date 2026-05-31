import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

// Vercel Cron Job: Daily database backup emailed to admin
// Schedule configured in vercel.json

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("🔄 Starting cloud database backup...");

    // Export all tables
    const backupData: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      source: "vercel-cron",
      tables: {} as Record<string, unknown[]>,
    };

    const tables = backupData.tables as Record<string, unknown[]>;

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

    // Count totals
    const totalRows = Object.values(tables).reduce(
      (sum, rows) => sum + (rows as unknown[]).length,
      0
    );

    // Email the backup
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || "atultiwari123321@gmail.com";
    const adminEmail2 = process.env.ADMIN_EMAIL_2 || "prashantmanitripathi2003@gmail.com";

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

      const fileName = `cloud-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;

      await transporter.sendMail({
        from: `"Atul Residency Cloud Backup" <${smtpUser}>`,
        to: `${adminEmail}, ${adminEmail2}`,
        subject: `☁️ Cloud Backup - ${dateStr} | ${totalRows} rows`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #14B8A6;">☁️ Atul Residency Cloud Backup</h2>
            <p>Automated cloud backup completed successfully.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="background: #f0f0f0;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString("en-IN")}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Rows</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${totalRows}</td></tr>
              <tr style="background: #f0f0f0;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tenants</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${(tables.Tenant as unknown[]).length}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Rent Records</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${(tables.RentRecord as unknown[]).length}</td></tr>
              <tr style="background: #f0f0f0;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Payments</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${(tables.Payment as unknown[]).length}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Source</strong></td><td style="padding: 8px; border: 1px solid #ddd;">Vercel Cloud Cron</td></tr>
            </table>
            <p style="color: #666; font-size: 12px;">To restore: download the attachment and run <code>npm run db:restore path/to/file.json</code></p>
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

      console.log(`📧 Cloud backup emailed to ${adminEmail} & ${adminEmail2}`);
    }

    return NextResponse.json({
      success: true,
      timestamp: backupData.timestamp,
      totalRows,
      tables: Object.fromEntries(
        Object.entries(tables).map(([k, v]) => [k, (v as unknown[]).length])
      ),
    });
  } catch (error) {
    console.error("❌ Cloud backup failed:", error);
    return NextResponse.json(
      { error: "Backup failed", details: String(error) },
      { status: 500 }
    );
  }
}
