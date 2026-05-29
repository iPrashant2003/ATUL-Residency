import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Admin phone whitelist for OTP login
const ADMIN_PHONES = ["7388389944", "6392651108"];

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Enter a valid email or 10-digit mobile number" }, { status: 400 });
    }

    const isEmail = identifier.includes("@");
    let cleanPhone = "";
    let targetEmail = "";
    
    let isAdmin = false;
    let tenant = null;

    if (isEmail) {
      targetEmail = identifier.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: targetEmail },
        include: { tenant: true },
      });
      
      if (user) {
        if (user.role === "ADMIN") isAdmin = true;
        else if (user.tenant && user.tenant.isActive) tenant = user.tenant;
      }
    } else {
      cleanPhone = identifier.replace(/\D/g, "").slice(-10);
      if (cleanPhone.length < 10) {
         return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
      }

      isAdmin = ADMIN_PHONES.includes(cleanPhone);
      
      tenant = await prisma.tenant.findFirst({
        where: {
          isActive: true,
          OR: [
            { phone: { endsWith: cleanPhone } },
            { whatsapp: { endsWith: cleanPhone } },
          ],
        },
      });
    }

    if (!isAdmin && !tenant) {
      return NextResponse.json(
        { error: "This credential is not registered. Contact the admin to get registered." },
        { status: 404 }
      );
    }

    // Determine target email/phone for sending
    if (isAdmin && !isEmail) {
       targetEmail = cleanPhone === "7388389944" ? (process.env.ADMIN_EMAIL_2 || "prashantmanitripathi2003@gmail.com") : (process.env.ADMIN_EMAIL || "atultiwari123321@gmail.com");
    } else if (tenant && !isEmail && tenant.email) {
       targetEmail = tenant.email;
    }

    if (isAdmin && isEmail) {
       // Best effort phone matching for admins if they logged in by email
       if (targetEmail === (process.env.ADMIN_EMAIL_2 || "prashantmanitripathi2003@gmail.com")) cleanPhone = "7388389944";
       if (targetEmail === (process.env.ADMIN_EMAIL || "atultiwari123321@gmail.com")) cleanPhone = "6392651108";
    } else if (tenant && isEmail && tenant.phone) {
       cleanPhone = tenant.phone.slice(-10);
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs safely
    const orConditions = [];
    if (cleanPhone) orConditions.push({ phone: cleanPhone, used: false });
    if (targetEmail) orConditions.push({ email: targetEmail, used: false });

    if (orConditions.length > 0) {
      await prisma.otpCode.updateMany({
        where: { OR: orConditions },
        data: { used: true },
      });
    }

    // Save new OTP
    await prisma.otpCode.create({
      data: { 
        phone: cleanPhone || null, 
        email: targetEmail || null,
        code, 
        expiresAt 
      },
    });

    console.log(`[OTP] Generated for ${targetEmail || cleanPhone} (Internal verification code: ${code})`);

    // 1. Send SMS via Fast2SMS
    let smsSent = false;
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey && cleanPhone) {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: fast2smsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "q",
            message: `Your Atul Residency OTP is: ${code}`,
            language: "english",
            flash: 0,
            numbers: cleanPhone,
          }),
        });
        const smsData = await smsRes.json();
        if (smsData.return === true) smsSent = true;
        console.log("[Fast2SMS]", smsData);
      } catch (e) {
        console.error("[Fast2SMS Error]", e);
      }
    }

    // 2. Send Email via NodeMailer (Dual-channel)
    let emailSent = false;
    if (targetEmail && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const { sendEmailOTP } = await import("@/lib/mailer");
      emailSent = await sendEmailOTP(targetEmail, code);
    }

    let simulated = false;
    if (!smsSent && !emailSent) {
      if (process.env.NODE_ENV === "development" || (!process.env.SMTP_USER && !process.env.FAST2SMS_API_KEY)) {
        simulated = true;
        console.log(`[OTP] SIMULATION MODE ACTIVE. OTP is: ${code}`);
      } else {
        return NextResponse.json(
          { error: "Failed to send OTP via SMS and Email. Please check your service provider balances and credentials." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: simulated
        ? "OTP sent successfully! (Simulated mode)"
        : "OTP sent successfully!",
      smsSent,
      emailSent,
      ...(simulated && { devOtp: code }),
    });
  } catch (err) {
    console.error("[send-otp]", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
