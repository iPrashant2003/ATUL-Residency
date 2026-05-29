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
    const data = await req.json();
    const { status, amountPaid, paidDate, notes } = data;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (amountPaid !== undefined) updateData.amountPaid = parseFloat(amountPaid);
    if (paidDate) updateData.paidDate = new Date(paidDate);
    if (notes !== undefined) updateData.notes = notes;

    // Auto-set paid date
    if (status === "PAID" && !paidDate) {
      updateData.paidDate = new Date();
    }

    const record = await prisma.rentRecord.update({
      where: { id },
      data: updateData,
      include: {
        tenant: { include: { room: { include: { tower: true } } } },
      },
    });

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Failed to update rent record" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await prisma.rentRecord.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            room: { include: { tower: true } },
            user: true,
          },
        },
        payments: true,
      },
    });
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Failed to fetch record" }, { status: 500 });
  }
}
