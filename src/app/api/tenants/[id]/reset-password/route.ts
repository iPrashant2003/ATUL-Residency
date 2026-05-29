import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Generate new unique secure password
    const newPassword = `Atul@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: tenant.userId },
      data: { password: hashed },
    });

    return NextResponse.json({
      success: true,
      newPassword,
      loginId: tenant.user.email,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
