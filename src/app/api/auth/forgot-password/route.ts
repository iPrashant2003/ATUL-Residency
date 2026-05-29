import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailOTP } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Enter a valid email or phone number" }, { status: 400 });
    }

    const isEmail = identifier.includes("@");
    let targetEmail = isEmail ? identifier.toLowerCase().trim() : "";
    let cleanPhone = isEmail ? "" : identifier.replace(/\D/g, "").slice(-10);

    const ADMIN_PHONES = ["7388389944", "6392651108"];
    const isAdminPhone = cleanPhone && ADMIN_PHONES.includes(cleanPhone);

    let user = null;

    if (isEmail) {
      user = await prisma.user.findUnique({ where: { email: targetEmail } });
    } else if (isAdminPhone) {
      const targetAdminEmail = cleanPhone === "7388389944" ? "prashantmanitripathi2003@gmail.com" : "atultiwari123321@gmail.com";
      user = await prisma.user.findFirst({ where: { email: targetAdminEmail } });
      if (user && user.phone !== cleanPhone) {
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: cleanPhone },
        });
      }
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
      return NextResponse.json(
        { error: "No account found with this credential." },
        { status: 404 }
      );
    }

    if (user.email) {
      targetEmail = user.email;
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs safely
    const orConditions = [];
    if (targetEmail) orConditions.push({ email: targetEmail, used: false });
    if (cleanPhone) orConditions.push({ phone: cleanPhone, used: false });

    if (orConditions.length > 0) {
      await prisma.otpCode.updateMany({
        where: { OR: orConditions },
        data: { used: true },
      });
    }

    // Save new OTP
    await prisma.otpCode.create({
      data: { email: targetEmail || null, phone: cleanPhone || null, code, expiresAt },
    });

    console.log(`[Forgot Password] OTP generated for ${targetEmail || cleanPhone} (Internal code: ${code})`);

    // Send Email if we have one and SMTP is configured
    let emailSent = false;
    if (targetEmail && process.env.SMTP_USER && process.env.SMTP_PASS) {
      emailSent = await sendEmailOTP(targetEmail, code);
    }

    // Send SMS if we have a phone and gateway is configured
    let smsSent = false;
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey && cleanPhone) {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: { authorization: fast2smsKey, "Content-Type": "application/json" },
          body: JSON.stringify({ route: "q", message: `Atul Residency Reset OTP: ${code}`, language: "english", flash: 0, numbers: cleanPhone }),
        });
        const smsData = await smsRes.json();
        if (smsData.return === true) smsSent = true;
      } catch (e) {
        console.error("[Forgot Password SMS Error]", e);
      }
    }

    // Fallback: If neither email nor SMS could be sent, check if we are in development or simulated mode
    let simulated = false;
    if (!emailSent && !smsSent) {
      if (process.env.NODE_ENV === "development" || (!process.env.SMTP_USER && !process.env.FAST2SMS_API_KEY)) {
        simulated = true;
        console.log(`[Forgot Password] SIMULATION MODE ACTIVE. OTP is: ${code}`);
      } else {
        return NextResponse.json(
          { error: "Failed to send reset code. Please check credentials or balance." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: simulated
        ? "OTP generated successfully (Simulated mode)"
        : "OTP sent successfully",
      ...(simulated && { devOtp: code }),
    });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
