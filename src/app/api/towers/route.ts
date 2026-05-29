import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET all towers
export async function GET() {
  try {
    const towers = await prisma.tower.findMany({
      include: {
        rooms: {
          include: {
            tenant: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const towersWithStats = towers.map((tower) => ({
      ...tower,
      totalRooms: tower.rooms.length,
      occupiedRooms: tower.rooms.filter((r) => r.isOccupied).length,
      vacantRooms: tower.rooms.filter((r) => !r.isOccupied).length,
    }));

    return NextResponse.json(towersWithStats);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch towers" }, { status: 500 });
  }
}

// POST create tower
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Tower name is required" }, { status: 400 });
    }

    const tower = await prisma.tower.create({
      data: { name, description },
    });

    return NextResponse.json(tower, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Tower name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create tower" }, { status: 500 });
  }
}
