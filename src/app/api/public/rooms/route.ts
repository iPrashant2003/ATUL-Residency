import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const registerUrl = req.nextUrl.searchParams.get("registerUrl");
    const secret = req.nextUrl.searchParams.get("secret");

    // Dynamic tunnel registration via public endpoint
    if (registerUrl) {
      const isValidSecret = secret === "atul_bot_secret_2026" || (!!process.env.BOT_SECRET && secret === process.env.BOT_SECRET);
      if (isValidSecret && registerUrl.startsWith("http")) {
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
      return NextResponse.json({ error: "Invalid secret or URL format", secret, registerUrl }, { status: 400 });
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
