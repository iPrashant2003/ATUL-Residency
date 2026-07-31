import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
