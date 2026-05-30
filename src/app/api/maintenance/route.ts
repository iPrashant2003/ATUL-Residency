import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    const requests = await prisma.maintenanceRequest.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...(status && { status: status as any }),
      },
      include: {
        tenant: {
          include: { room: { include: { tower: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: "Failed to fetch maintenance requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, category, title, description, photoUrl, priority } = await req.json();

    if (!tenantId || !title || !description) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        tenantId,
        category: category || "OTHER",
        title,
        description,
        photoUrl,
        priority: priority || "NORMAL",
        status: "OPEN",
      },
      include: {
        tenant: { include: { room: { include: { tower: true } } } },
      },
    });

    // Notify all admins about the maintenance request
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      const tenant = request.tenant;
      const roomNo = tenant?.room?.number || "—";
      const towerName = tenant?.room?.tower?.name || "";

      // In-app database notifications
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "MAINTENANCE_UPDATE",
          title: `New Maintenance Request: ${category}`,
          message: `Room ${roomNo} (${tenant?.name}) requested: "${title}".`,
        })),
      });

      // Web push notifications
      for (const admin of admins) {
        await sendPushNotification(
          admin.id,
          `Maintenance Requested: ${category} 🔧`,
          `Room ${roomNo} (${tenant?.name}): "${title}". Tap to view.`,
          `/admin/maintenance`
        ).catch((e) => console.error("Admin maintenance push error:", e));
      }
    } catch (notifErr) {
      console.error("[Maintenance notification error]", notifErr);
    }

    return NextResponse.json(request, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create maintenance request" }, { status: 500 });
  }
}
