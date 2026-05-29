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

    // Find all rooms in this tower
    const rooms = await prisma.room.findMany({
      where: { towerId: id },
      include: { tenant: true }
    });
    
    // Get all userIds of tenants in these rooms
    const userIds = rooms
      .map(r => r.tenant?.userId)
      .filter((userId): userId is string => !!userId);
      
    if (userIds.length > 0) {
      // Delete all those Users (will cascade delete Tenants, RentRecords, etc.)
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
    }

    await prisma.tower.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tower error:", error);
    return NextResponse.json({ error: "Failed to delete tower" }, { status: 500 });
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
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.floors !== undefined) updateData.floors = parseInt(String(body.floors));

    const tower = await prisma.tower.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(tower);
  } catch (error) {
    console.error("Update tower error:", error);
    return NextResponse.json({ error: "Failed to update tower" }, { status: 500 });
  }
}
