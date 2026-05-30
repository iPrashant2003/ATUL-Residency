import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendPushNotification } from "@/lib/push";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, adminNotes } = await req.json();
    const updateData: any = { status, adminNotes };
    if (status === "RESOLVED" || status === "CLOSED") {
      updateData.resolvedAt = new Date();
    }

    const request = await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData,
      include: { tenant: { include: { room: { include: { tower: true } } } } },
    });

    // Trigger PWA Push Notification to the tenant about maintenance request status
    if (request.tenant && request.tenant.userId) {
      const messageTitle = "Maintenance Update 🔧";
      const messageBody = `Hi ${request.tenant.name}, your maintenance request "${request.title}" status is now "${status.replace("_", " ")}".`;

      await sendPushNotification(
        request.tenant.userId,
        messageTitle,
        messageBody,
        "/tenant/maintenance"
      ).catch(e => console.error("Push notify error:", e));
    }

    // Notify tenant on status resolution/closure in a premium, creative manner (WhatsApp & Portal)
    if (request.tenant && (status === "RESOLVED" || status === "CLOSED")) {
      try {
        const tenant = request.tenant;
        // Portal Notification
        await prisma.notification.create({
          data: {
            userId: tenant.userId,
            type: "MAINTENANCE_UPDATE",
            title: "Maintenance Completed! 🎉",
            message: `Dear ${tenant.name}, your maintenance request "${request.title}" has been successfully completed and closed. Thank you! Atul Residency.`
          }
        });

        // WhatsApp message
        if (tenant.whatsapp) {
          const completedWhatsappMsg = `✨ *ATUL RESIDENCY* ✨\n✅ *Maintenance Request Completed*\n\nDear *${tenant.name}*,\n\nWe are pleased to inform you that your maintenance request has been successfully resolved & closed! 🎉\n\n📝 *Task*: ${request.title}\n🔧 *Status*: COMPLETED & CLOSED\n\nThank you for your cooperation. We strive to provide you with the highest standard of living at Atul Residency. 🌟\n\nWarm regards,\n*Atul Residency Support*`;
          
          await prisma.whatsappQueue.create({
            data: {
              number: tenant.whatsapp,
              message: completedWhatsappMsg,
              status: "PENDING"
            }
          });
        }
      } catch (tenantErr) {
        console.error("[Tenant maintenance resolved notification error]", tenantErr);
      }
    }

    return NextResponse.json(request);
  } catch {
    return NextResponse.json({ error: "Failed to update maintenance request" }, { status: 500 });
  }
}
