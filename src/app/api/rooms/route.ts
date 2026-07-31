import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

import { ensureCurrentMonthRentRecords } from "@/lib/rent-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const towerId = searchParams.get("towerId");
    const vacant = searchParams.get("vacant");

    // Automatically ensure all active renters have a RentRecord for the current calendar month
    await ensureCurrentMonthRentRecords();

    const whereClause: any = {};
    if (towerId) whereClause.towerId = towerId;
    if (vacant === "true") whereClause.isOccupied = false;

    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        tower: true,
        tenant: {
          include: {
            user: true,
            rentRecords: {
              orderBy: [{ year: "desc" }, { month: "desc" }],
              take: 12,
            },
          },
        },
      },
      orderBy: [{ towerId: "asc" }, { number: "asc" }],
    });

    return NextResponse.json(rooms);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { number, category, baseRent, meterNumber, description, towerId } = await req.json();

    if (!number || !baseRent || !towerId) {
      return NextResponse.json({ error: "Room number, rent, and tower are required" }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: { number, category: category || "Standard", baseRent: parseFloat(baseRent), meterNumber, description, towerId },
      include: { tower: true },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Room number already exists in this tower" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
