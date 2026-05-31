import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const towerId = searchParams.get("towerId");
    const search = searchParams.get("search");
    const userId = searchParams.get("userId");

    const tenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        ...(userId && { userId }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { room: { number: { contains: search } } },
          ],
        }),
        ...(towerId && { room: { towerId } }),
      },
      include: {
        user: true,
        room: { include: { tower: true } },
        rentRecords: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        maintenanceRequests: {
          where: { status: { not: "CLOSED" } },
        },
      },
      orderBy: { name: "asc" },
    });

    const tenantsWithLatest = tenants.map((t) => ({
      ...t,
      latestRent: t.rentRecords?.[0] || null,
    }));

    return NextResponse.json(tenantsWithLatest, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const {
      name, email, phone, whatsapp, alternatePhone,
      aadhaarNumber, aadhaarImageUrl, photoUrl,
      roomId, rentAmount, securityDeposit, joiningDate,
    } = data;

    if (!name || !phone || !roomId || !rentAmount) {
      return NextResponse.json({ error: "Name, phone, room, and rent are required" }, { status: 400 });
    }

    // Check room availability
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.isOccupied) return NextResponse.json({ error: "Room is already occupied" }, { status: 409 });

    // Generate unique Login ID and Password for the tenant
    const bcrypt = await import("bcryptjs");
    const uniqueNumber = Math.floor(100000 + Math.random() * 900000);
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const generatedPassword = `Atul@${uniqueNumber}`;
    const userEmail = (email && email.trim() !== "") ? email.trim().toLowerCase() : `${phone.replace(/\\D/g, "")}@tenant.com`;

    const hashed = await bcrypt.hash(generatedPassword, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email: userEmail,
        phone,
        password: hashed,
        role: "TENANT",
      },
    });
    const userId = user.id;
    const generatedLoginId = (email && email.trim() !== "") ? email.trim() : phone;

    const tenant = await prisma.tenant.create({
      data: {
        userId,
        roomId,
        name,
        phone,
        whatsapp: whatsapp || phone,
        alternatePhone,
        email: email || null, // Store personal email in Tenant email field
        aadhaarNumber,
        aadhaarImageUrl,
        photoUrl,
        rentAmount: parseFloat(rentAmount),
        securityDeposit: parseFloat(securityDeposit || "0"),
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      },
      include: {
        user: true,
        room: { include: { tower: true } },
      },
    });

    // Mark room as occupied
    await prisma.room.update({ where: { id: roomId }, data: { isOccupied: true } });

    // Return the created tenant along with generated Login ID and Password
    return NextResponse.json({
      ...tenant,
      generatedLoginId,
      generatedPassword,
    }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      if (error.meta?.modelName === "User") {
        return NextResponse.json({ error: "Phone number or Email already exists! Please use a different one." }, { status: 409 });
      }
      return NextResponse.json({ error: "This room already has a renter. Please select a different room." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}
