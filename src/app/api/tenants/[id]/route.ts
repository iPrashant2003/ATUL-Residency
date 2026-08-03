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
    const body = await req.json();

    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const {
      name,
      email,
      phone,
      whatsapp,
      alternatePhone,
      aadhaarNumber,
      photoUrl,
      aadhaarImageUrl,
      rentAmount,
      securityDeposit,
      joiningDate,
      roomId,
    } = body;

    const updateData: any = {};

    if (name !== undefined && name !== "") updateData.name = name.trim();
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (phone !== undefined && phone !== "") updateData.phone = phone.trim();
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp ? whatsapp.trim() : null;
    if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone ? alternatePhone.trim() : null;
    if (aadhaarNumber !== undefined) updateData.aadhaarNumber = aadhaarNumber ? aadhaarNumber.trim() : null;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
    if (aadhaarImageUrl !== undefined) updateData.aadhaarImageUrl = aadhaarImageUrl || null;
    if (rentAmount !== undefined && rentAmount !== "") updateData.rentAmount = Number(rentAmount);
    if (securityDeposit !== undefined && securityDeposit !== "") updateData.securityDeposit = Number(securityDeposit);

    if (joiningDate) {
      const parsedDate = new Date(joiningDate);
      if (!isNaN(parsedDate.getTime())) {
        updateData.joiningDate = parsedDate;
      }
    }

    // Room re-assignment handling if roomId is changed
    if (roomId && roomId !== existingTenant.roomId) {
      const newRoom = await prisma.room.findUnique({ where: { id: roomId } });
      if (!newRoom) {
        return NextResponse.json({ error: "Selected room does not exist" }, { status: 404 });
      }
      if (newRoom.isOccupied) {
        return NextResponse.json({ error: `Room ${newRoom.number} is already occupied` }, { status: 409 });
      }

      // Mark old room as vacant
      if (existingTenant.roomId) {
        await prisma.room.update({
          where: { id: existingTenant.roomId },
          data: { isOccupied: false },
        });
      }

      // Mark new room as occupied
      await prisma.room.update({
        where: { id: roomId },
        data: { isOccupied: true },
      });

      updateData.roomId = roomId;
    }

    // Also update associated User table record if name or email changed
    if (name || email) {
      await prisma.user.update({
        where: { id: existingTenant.userId },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(email !== undefined ? { email: email ? email.trim() : existingTenant.userId } : {}),
        },
      });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: { room: { include: { tower: true } }, user: true },
    });

    return NextResponse.json(updatedTenant);
  } catch (error: any) {
    console.error("PATCH tenant error:", error);
    return NextResponse.json({ error: error.message || "Failed to update tenant" }, { status: 500 });
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

    // Get deletion reason from request body (optional)
    let deletionReason = "Removed by admin";
    try {
      const body = await req.json();
      if (body?.reason) deletionReason = body.reason;
    } catch {
      // No body provided, use default reason
    }

    // SOFT DELETE: Mark tenant as deleted, save original room for restore, and free the room
    await prisma.tenant.update({
      where: { id },
      data: {
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
        deletionReason,
        archivedFromRoomId: tenant.roomId, // Remember which room they were in
        roomId: null, // Free the room's unique constraint so it can be reassigned
      },
    });

    // Mark room as vacant
    if (tenant.roomId) {
      await prisma.room.update({ where: { id: tenant.roomId }, data: { isOccupied: false } });
    }

    // Mark the associated user as archived (but don't delete)
    await prisma.user.update({
      where: { id: tenant.userId },
      data: { name: `[Archived] ${tenant.name}` },
    });

    return NextResponse.json({ success: true, message: "Tenant archived successfully. Can be recovered from Archived Renters." });
  } catch (error) {
    console.error("Delete tenant error:", error);
    return NextResponse.json({ error: "Failed to remove tenant" }, { status: 500 });
  }
}
