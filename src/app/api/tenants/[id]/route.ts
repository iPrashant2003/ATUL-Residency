import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        user: true,
        room: { include: { tower: true } },
        rentRecords: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        maintenanceRequests: { orderBy: { createdAt: "desc" } },
        documents: true,
      },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const data = await req.json();
    const tenant = await prisma.tenant.update({
      where: { id },
      data,
      include: { room: { include: { tower: true } }, user: true },
    });
    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

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
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    // Mark room as vacant
    await prisma.room.update({ where: { id: tenant.roomId }, data: { isOccupied: false } });

    // Hard delete the associated User, which will cascade-delete the Tenant and all related records
    await prisma.user.delete({ where: { id: tenant.userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tenant error:", error);
    return NextResponse.json({ error: "Failed to remove tenant" }, { status: 500 });
  }
}
