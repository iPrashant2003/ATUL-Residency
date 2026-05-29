import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, adminNotes } = await req.json();
    const updateData: any = { status, adminNotes };
    if (status === "RESOLVED" || status === "CLOSED") {
      updateData.resolvedAt = new Date();
    }

    const request = await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData,
      include: { tenant: { include: { room: { include: { tower: true } } } } },
    });

    return NextResponse.json(request);
  } catch {
    return NextResponse.json({ error: "Failed to update maintenance request" }, { status: 500 });
  }
}
