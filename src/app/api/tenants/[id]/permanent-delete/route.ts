import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// DELETE: Permanently delete an archived tenant (no recovery possible)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const password = req.headers.get("x-admin-password");
    if (!password) {
      return NextResponse.json({ error: "Admin password required for permanent deletion" }, { status: 400 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });
    if (!adminUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const isPasswordCorrect = await bcrypt.compare(password, adminUser.password);
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 });
    }

    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Permanently delete the user (cascades to tenant and related records)
    await prisma.user.delete({ where: { id: tenant.userId } });

    return NextResponse.json({ success: true, message: "Tenant permanently deleted" });
  } catch (error) {
    console.error("Permanent delete error:", error);
    return NextResponse.json({ error: "Failed to permanently delete tenant" }, { status: 500 });
  }
}
