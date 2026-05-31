import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST: Restore an archived (soft-deleted) tenant
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { roomId: newRoomId } = body; // Optional: assign to a specific room

    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.isDeleted) {
      return NextResponse.json({ error: "Tenant is not archived" }, { status: 400 });
    }

    // Determine which room to restore to:
    // 1. Explicit roomId from request body
    // 2. The original room they were archived from
    const targetRoomId = newRoomId || tenant.archivedFromRoomId;

    if (!targetRoomId) {
      return NextResponse.json({
        error: "No room available for restoration. Please specify a roomId.",
      }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: targetRoomId } });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.isOccupied) {
      return NextResponse.json({
        error: `Room ${room.number} is already occupied. Please assign a different room.`,
      }, { status: 409 });
    }

    // Restore tenant: set roomId back, clear archive fields
    await prisma.tenant.update({
      where: { id },
      data: {
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        deletionReason: null,
        archivedFromRoomId: null,
        roomId: targetRoomId,
      },
    });

    // Mark room as occupied
    await prisma.room.update({ where: { id: targetRoomId }, data: { isOccupied: true } });

    // Restore user name (remove [Archived] prefix)
    const user = await prisma.user.findUnique({ where: { id: tenant.userId } });
    if (user && user.name.startsWith("[Archived] ")) {
      await prisma.user.update({
        where: { id: tenant.userId },
        data: { name: user.name.replace("[Archived] ", "") },
      });
    }

    const restored = await prisma.tenant.findUnique({
      where: { id },
      include: {
        user: true,
        room: { include: { tower: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tenant ${tenant.name} restored successfully to Room ${room.number}!`,
      tenant: restored,
    });
  } catch (error) {
    console.error("Restore tenant error:", error);
    return NextResponse.json({ error: "Failed to restore tenant" }, { status: 500 });
  }
}
