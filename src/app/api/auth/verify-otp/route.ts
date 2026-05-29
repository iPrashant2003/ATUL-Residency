import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { identifier, code } = await req.json();

    if (!identifier || !code) {
      return NextResponse.json({ error: "Identifier and OTP are required" }, { status: 400 });
    }

    const isEmail = identifier.includes("@");
    let targetEmail = isEmail ? identifier.toLowerCase().trim() : "";
    let cleanPhone = isEmail ? "" : identifier.replace(/\D/g, "").slice(-10);

    const orConditions = [];
    if (cleanPhone) orConditions.push({ phone: cleanPhone });
    if (targetEmail) orConditions.push({ email: targetEmail });

    if (orConditions.length === 0) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    // Find valid OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        OR: orConditions,
        code: code.trim(),
        used: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP. Please try again." }, { status: 400 });
    }

    // Get current DB time to avoid timezone mismatch on naive datetime columns
    let dbNow = new Date();
    try {
      const dbTimeRes: any = await prisma.$queryRaw`SELECT NOW() as now`;
      if (dbTimeRes && dbTimeRes[0] && dbTimeRes[0].now) {
        dbNow = new Date(dbTimeRes[0].now);
      }
    } catch (err) {
      console.error("[verify-otp] Failed to get DB time, falling back to local time", err);
    }

    if (otpRecord.expiresAt.getTime() <= dbNow.getTime()) {
      return NextResponse.json({ error: "Invalid or expired OTP. Please try again." }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

    const ADMIN_PHONES = ["7388389944", "6392651108"];
    const isAdminPhone = cleanPhone && ADMIN_PHONES.includes(cleanPhone);

    let foundUser = null;

    if (isEmail) {
      foundUser = await prisma.user.findUnique({
        where: { email: targetEmail },
        include: { tenant: true },
      });
    } else if (isAdminPhone) {
      // Find the specific admin user by email matching their whitelist phone
      const targetAdminEmail = cleanPhone === "7388389944" ? "prashantmanitripathi2003@gmail.com" : "atultiwari123321@gmail.com";
      foundUser = await prisma.user.findFirst({
        where: { email: targetAdminEmail },
        include: { tenant: true },
      });

      // Dynamically align the admin phone in the database
      if (foundUser && foundUser.phone !== cleanPhone) {
        await prisma.user.update({
          where: { id: foundUser.id },
          data: { phone: cleanPhone },
        });
      }
    } else {
      // Find user by phone in User table first
      foundUser = await prisma.user.findFirst({
        where: { phone: { endsWith: cleanPhone } },
        include: { tenant: true },
      });

      if (!foundUser) {
        // Try finding via tenant phone
        const tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { phone: { endsWith: cleanPhone } },
              { whatsapp: { endsWith: cleanPhone } },
            ],
          },
          include: { user: { include: { tenant: true } } },
        });
        if (tenant) foundUser = tenant.user as any;
      }
    }

    if (!foundUser) {
      return NextResponse.json({ error: "No account found for this credential" }, { status: 404 });
    }

    // Return user info for NextAuth credentials signin
    return NextResponse.json({
      success: true,
      email: foundUser.email,
      userId: foundUser.id,
      role: foundUser.role,
    });
  } catch (err) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ error: "OTP verification failed" }, { status: 500 });
  }
}
