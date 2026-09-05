import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  await headers();
  try {


    const rooms = await prisma.room.findMany({
      select: {
        id: true,
        number: true,
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
        { number: "asc" },
      ],
    });

    const formattedRooms = rooms.map((room) => ({
      roomId: room.id,
      roomNumber: room.number,
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
