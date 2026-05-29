import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch only Tower A and Tower B
    const towers = await prisma.tower.findMany({
      where: {
        name: {
          in: ["Tower A", "Tower B"],
        },
      },
      include: {
        rooms: true,
      },
    });

    let totalRooms = 0;
    let occupiedRooms = 0;

    const towerStats = towers.map((t) => {
      const total = t.rooms.length;
      const occupied = t.rooms.filter((r) => r.isOccupied).length;
      const vacant = total - occupied;

      totalRooms += total;
      occupiedRooms += occupied;

      return {
        name: t.name,
        totalRooms: total,
        occupiedRooms: occupied,
        vacantRooms: vacant,
      };
    });

    const vacantRooms = totalRooms - occupiedRooms;

    return NextResponse.json(
      {
        totalRooms,
        occupiedRooms,
        vacantRooms,
        totalTowers: towers.length,
        towerStats,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("[public-stats error]", error);
    return NextResponse.json({ error: "Failed to fetch public stats" }, { status: 500 });
  }
}
