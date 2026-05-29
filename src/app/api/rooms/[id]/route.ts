import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const password = req.headers.get("x-admin-password");
    if (!password) {
      return NextResponse.json({ error: "Admin password is required to delete" }, { status: 400 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    const isPasswordCorrect = await bcrypt.compare(password, adminUser.password);
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
    }

    const { id } = await params;
    
    // Find the room and its associated tenant
    const room = await prisma.room.findUnique({
      where: { id },
      include: { tenant: true },
    });
    
    if (room?.tenant) {
      // Delete the User, which will cascade delete the Tenant and all their records
      await prisma.user.delete({
        where: { id: room.tenant.userId },
      });
    }

    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete room error:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    
    const updateData: any = {};
    if (body.number !== undefined) updateData.number = body.number;
    if (body.floor !== undefined) updateData.floor = parseInt(String(body.floor));
    if (body.category !== undefined) updateData.category = body.category;
    if (body.baseRent !== undefined) updateData.baseRent = parseFloat(String(body.baseRent));
    if (body.meterNumber !== undefined) updateData.meterNumber = body.meterNumber;
    if (body.towerId !== undefined) updateData.towerId = body.towerId;
    if (body.description !== undefined) updateData.description = body.description;

    const room = await prisma.room.update({ 
      where: { id }, 
      data: updateData 
    });
    return NextResponse.json(room);
  } catch (error) {
    console.error("Update room error:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: { tower: true, tenant: { include: { user: true } } },
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json(room);
  } catch {
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}
