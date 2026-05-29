import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { identifier, otp, newPassword } = await req.json();

    if (!identifier || !otp || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const isEmail = identifier.includes("@");
    const targetEmail = isEmail ? identifier.toLowerCase().trim() : "";
    const cleanPhone = isEmail ? "" : identifier.replace(/\D/g, "").slice(-10);

    const orConditions = [];
    if (targetEmail) orConditions.push({ email: targetEmail });
    if (cleanPhone) orConditions.push({ phone: cleanPhone });

    if (orConditions.length === 0) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    // Verify OTP
    const validOtp = await prisma.otpCode.findFirst({
      where: {
        OR: orConditions,
        code: otp,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Find the user to reset
    const ADMIN_PHONES = ["7388389944", "6392651108"];
    const isAdminPhone = cleanPhone && ADMIN_PHONES.includes(cleanPhone);

    let user = null;
    if (isEmail) {
      user = await prisma.user.findUnique({ where: { email: targetEmail } });
    } else if (isAdminPhone) {
      const targetAdminEmail = cleanPhone === "7388389944" ? "prashantmanitripathi2003@gmail.com" : "atultiwari123321@gmail.com";
      user = await prisma.user.findFirst({ where: { email: targetAdminEmail } });
    } else {
      user = await prisma.user.findFirst({ where: { phone: { endsWith: cleanPhone } } });
      if (!user) {
        const tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { phone: { endsWith: cleanPhone } },
              { whatsapp: { endsWith: cleanPhone } },
            ],
          },
          include: { user: true },
        });
        if (tenant) user = tenant.user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Account not found to reset" }, { status: 404 });
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: validOtp.id },
      data: { used: true },
    });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
