import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, tenantId, category, title, description, photoUrl, priority } = body;

    if (!title || (!roomId && !tenantId)) {
      return NextResponse.json({ error: "Room number and issue title are required" }, { status: 400 });
    }

    let tenant = null;
    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { room: { include: { tower: true } } },
      });
    } else if (roomId) {
      tenant = await prisma.tenant.findFirst({
        where: { roomId, isActive: true, isDeleted: false },
        include: { room: { include: { tower: true } } },
      });
    }

    if (!tenant) {
      return NextResponse.json({ error: "No active resident found for this room. Please select a valid occupied room." }, { status: 404 });
    }

    // Determine category enum mapping
    let categoryEnum: "PLUMBING" | "ELECTRICIAN" | "CARPENTER" | "CLEANING" | "SECURITY" | "OTHER" = "OTHER";
    const catUpper = (category || "").toUpperCase();
    if (catUpper.includes("PLUMB") || catUpper.includes("WATER")) categoryEnum = "PLUMBING";
    else if (catUpper.includes("ELECTR") || catUpper.includes("LIGHT") || catUpper.includes("POWER")) categoryEnum = "ELECTRICIAN";
    else if (catUpper.includes("CARPENT") || catUpper.includes("WOOD") || catUpper.includes("DOOR") || catUpper.includes("WINDOW")) categoryEnum = "CARPENTER";
    else if (catUpper.includes("CLEAN") || catUpper.includes("PEST")) categoryEnum = "CLEANING";
    else if (catUpper.includes("SECUR") || catUpper.includes("LOCK")) categoryEnum = "SECURITY";

    // Create MaintenanceRequest
    const request = await prisma.maintenanceRequest.create({
      data: {
        tenantId: tenant.id,
        category: categoryEnum,
        title,
        description: description || title,
        photoUrl: photoUrl || null,
        status: "OPEN",
        priority: priority || "NORMAL",
      },
      include: {
        tenant: {
          include: {
            room: { include: { tower: true } },
          },
        },
      },
    });

    // 1. Queue Automated WhatsApp Acknowledgment to Renter
    if (tenant.whatsapp) {
      const roomNum = tenant.room?.number || "—";
      const towerName = tenant.room?.tower?.name ? `(${tenant.room.tower.name})` : "";
      const categoryLabel = category || "General Maintenance";

      const whatsappMsg = `✨ *ATUL RESIDENCY* ✨\n🏢 *Maintenance Request Received*\n\nDear *${tenant.name}*,\n\nYour maintenance request for *Room ${roomNum} ${towerName}* (*${categoryLabel}*) has been logged successfully. 🛠️\n\n📋 *Issue*: ${title}\n⏱️ *Commitment*: Your work will be done in 24 hrs max. ⏳\n\nThank you for informing us! 🙏\n\nWarm regards,\n*Atul Residency Management*`;

      await prisma.whatsappQueue.create({
        data: {
          number: tenant.whatsapp,
          message: whatsappMsg,
          status: "PENDING",
        },
      });
      console.log(`Queued public maintenance WhatsApp acknowledgement for ${tenant.name}`);
    }

    // 2. Create Admin Notification
    const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "MAINTENANCE_UPDATE",
          title: `New Maintenance Query - Room ${tenant.room?.number || ""} 🛠️`,
          message: `${tenant.name} (Room ${tenant.room?.number || ""}) logged a maintenance request: "${title}". Promised: 24 hrs max.`,
        },
      });

      // Send Push Notification
      await sendPushNotification(
        admin.id,
        `New Maintenance Query 🛠️`,
        `Room ${tenant.room?.number || ""}: ${title} (${tenant.name})`,
        `/admin/maintenance`
      ).catch((e) => console.error("Push notify admin error:", e));
    }

    return NextResponse.json({
      success: true,
      requestId: request.id,
      message: "Maintenance request logged successfully! Commitment: work will be done in 24 hrs max.",
      request,
    }, { status: 201 });
  } catch (error) {
    console.error("Public maintenance API error:", error);
    return NextResponse.json({ error: "Failed to submit maintenance request" }, { status: 500 });
  }
}
