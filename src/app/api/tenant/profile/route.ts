import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          include: { room: { include: { tower: true } } },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const data = await req.json();
    const { name, email, phone, whatsapp, alternatePhone, aadhaarNumber, photoUrl, aadhaarImageUrl, currentPassword, newPassword } = data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle password change if requested
    let hashedPassword = user.password;
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password" }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid current password" }, { status: 400 });
      }
      hashedPassword = await bcrypt.hash(newPassword, 12);
    }

    // Update User
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        password: hashedPassword,
      },
    });

    // Update Tenant profile if user is a tenant
    if (user.role === "TENANT") {
      const tenant = await prisma.tenant.findUnique({ where: { userId } });
      if (tenant) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            name: name || tenant.name,
            phone: phone || tenant.phone,
            whatsapp: whatsapp || tenant.whatsapp,
            alternatePhone: alternatePhone !== undefined ? alternatePhone : tenant.alternatePhone,
            aadhaarNumber: aadhaarNumber !== undefined ? aadhaarNumber : tenant.aadhaarNumber,
            photoUrl: photoUrl !== undefined ? photoUrl : tenant.photoUrl,
            aadhaarImageUrl: aadhaarImageUrl !== undefined ? aadhaarImageUrl : tenant.aadhaarImageUrl,
            email: email || tenant.email,
          },
        });
      }
    }

    return NextResponse.json({ success: true, user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
