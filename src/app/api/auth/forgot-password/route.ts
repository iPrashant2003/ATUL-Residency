import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailOTP } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Enter a valid username, email or phone number" }, { status: 400 });
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
    } else if (cleanPhone && /^\d+$/.test(cleanPhone)) {
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
    } else {
      // Username / Name search case-insensitive
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: identifier.trim(), mode: "insensitive" } },
            { email: { equals: identifier.toLowerCase().trim() } },
          ]
        }
      });
      if (!user) {
        // Try tenant name search
        const tenant = await prisma.tenant.findFirst({
          where: {
            name: { equals: identifier.trim(), mode: "insensitive" }
          },
          include: { user: true }
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

    // Set correct email and phone from retrieved user record for OTP delivery
    if (user.email) {
      targetEmail = user.email;
    }
    if (user.phone) {
      cleanPhone = user.phone.replace(/\D/g, "").slice(-10);
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

    // Send WhatsApp Message if we have a phone
    let smsSent = false;
    if (cleanPhone) {
      try {
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = `🏢 *ATUL RESIDENCY*\n\nYour Password Reset OTP is: *${code}*\n\nThis code is valid for 10 minutes. Please do not share it with anyone.`;
        
        await prisma.whatsappQueue.create({
            data: {
                number: formattedPhone,
                message: msg,
                status: 'PENDING'
            }
        });
        console.log(`[Forgot Password] Queued WhatsApp OTP for ${formattedPhone}`);
        smsSent = true;
      } catch (e) {
        console.error("[Forgot Password WhatsApp Queue Error]", e);
      }
    }

    // Fallback: If neither email nor WhatsApp could be queued, check if we are in development or simulated mode
    let simulated = false;
    if (!emailSent && !smsSent) {
      if (process.env.NODE_ENV === "development" || !process.env.SMTP_USER) {
        simulated = true;
        console.log(`[Forgot Password] SIMULATION MODE ACTIVE. OTP is: ${code}`);
      } else {
        return NextResponse.json(
          { error: "Failed to send reset code. Please check credentials or system health." },
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
