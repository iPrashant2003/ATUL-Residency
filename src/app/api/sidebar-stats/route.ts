import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    
    // Default stats
    let stats = {
      payments: 0,
      maintenance: 0,
      notifications: 0,
      rent: 0,
    };

    if (role === "ADMIN") {
      // Admin gets total global counts
      const [payments, maintenance, notifications, rent] = await Promise.all([
        prisma.payment.count({ where: { status: "PENDING" } }),
        prisma.maintenanceRequest.count({ where: { status: "OPEN" } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.rentRecord.count({ where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } } }),
      ]);
      stats = { payments, maintenance, notifications, rent };
    } else {
      // Tenant gets their specific counts
      const tenant = await prisma.tenant.findUnique({ where: { userId } });
      if (tenant) {
        const [payments, maintenance, notifications, rent] = await Promise.all([
          prisma.payment.count({ where: { tenantId: tenant.id, status: "PENDING" } }),
          prisma.maintenanceRequest.count({ where: { tenantId: tenant.id, status: "OPEN" } }),
          prisma.notification.count({ where: { userId, isRead: false } }),
          prisma.rentRecord.count({ where: { tenantId: tenant.id, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } } }),
        ]);
        stats = { payments, maintenance, notifications, rent };
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Sidebar stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
