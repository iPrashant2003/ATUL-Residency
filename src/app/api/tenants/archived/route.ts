import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch all archived (soft-deleted) tenants
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const archivedTenants = await prisma.tenant.findMany({
      where: { isDeleted: true },
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
      },
      orderBy: { deletedAt: "desc" },
    });

    // Resolve archivedFromRoomId to get original room info for display
    const enriched = await Promise.all(
      archivedTenants.map(async (t) => {
        let archivedRoom = null;
        if (t.archivedFromRoomId) {
          archivedRoom = await prisma.room.findUnique({
            where: { id: t.archivedFromRoomId },
            include: { tower: true },
          });
        }
        return {
          ...t,
          // Use archivedRoom as fallback when room is null (which it will be for archived tenants)
          room: t.room || archivedRoom,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch archived tenants:", error);
    return NextResponse.json({ error: "Failed to fetch archived tenants" }, { status: 500 });
  }
}
