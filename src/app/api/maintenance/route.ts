import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    const requests = await prisma.maintenanceRequest.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...(status && { status: status as any }),
      },
      include: {
        tenant: {
          include: { room: { include: { tower: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: "Failed to fetch maintenance requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, category, title, description, photoUrl, priority } = await req.json();

    if (!tenantId || !title || !description) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        tenantId,
        category: category || "OTHER",
        title,
        description,
        photoUrl,
        priority: priority || "NORMAL",
        status: "OPEN",
      },
      include: {
        tenant: { include: { room: { include: { tower: true } } } },
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create maintenance request" }, { status: 500 });
  }
}
