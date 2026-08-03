import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  await headers(); // Ensures dynamic per-request execution on Next.js 15
  try {
    // Dynamic tunnel registration via public endpoint
    const registerUrl = req.nextUrl.searchParams.get("registerUrl") || req.nextUrl.searchParams.get("url") || req.nextUrl.searchParams.get("tunnel");
    if (registerUrl && registerUrl.startsWith("http")) {
      const cleanUrl = registerUrl.replace(/\/$/, "");
      await prisma.activityLog.create({
        data: {
          action: "WHATSAPP_BOT_URL",
          entity: "SYSTEM",
          details: cleanUrl,
        },
      });
      console.log(`[Public Rooms API] Dynamically registered WhatsApp Bot URL: ${cleanUrl}`);
      return NextResponse.json({ success: true, registeredUrl: cleanUrl });
    }
    const rooms = await prisma.room.findMany({
      where: { isOccupied: true },
      include: {
        tower: true,
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
          },
        },
      },
      orderBy: [{ towerId: "asc" }, { number: "asc" }],
    });

    const mappedRooms = rooms.map((r) => ({
      roomId: r.id,
      roomNumber: r.number,
      towerName: r.tower?.name || "",
      tenantId: r.tenant?.id || null,
      tenantName: r.tenant?.name || "",
      tenantPhone: r.tenant?.whatsapp || r.tenant?.phone || "",
    }));

    return NextResponse.json(mappedRooms, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Public rooms API error:", error);
    return NextResponse.json({ error: "Failed to fetch room directory" }, { status: 500 });
  }
}
