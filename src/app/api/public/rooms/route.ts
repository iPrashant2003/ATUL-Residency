import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const headerList = await headers();
  try {
    let registerUrl = req.nextUrl?.searchParams?.get("url") ||
                      req.nextUrl?.searchParams?.get("registerUrl") ||
                      req.nextUrl?.searchParams?.get("tunnel");

    if (!registerUrl) {
      const fullUrl = headerList.get("x-url") || headerList.get("x-invoke-path") || req.url || "";
      if (fullUrl.includes("?")) {
        try {
          const qs = fullUrl.split("?")[1];
          const params = new URLSearchParams(qs);
          registerUrl = params.get("url") || params.get("registerUrl") || params.get("tunnel");
        } catch (e) {}
      }
    }

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
      select: {
        id: true,
        roomNumber: true,
        tower: { select: { name: true } },
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { tower: { name: "asc" } },
        { roomNumber: "asc" },
      ],
    });

    const formattedRooms = rooms.map((room) => ({
      roomId: room.id,
      roomNumber: room.roomNumber,
      towerName: room.tower.name,
      tenantId: room.tenant?.id || null,
      tenantName: room.tenant?.name || null,
      tenantPhone: room.tenant?.phone || null,
    }));

    return NextResponse.json(formattedRooms);
  } catch (error: any) {
    console.error("Public rooms fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch public rooms" }, { status: 500 });
  }
}
