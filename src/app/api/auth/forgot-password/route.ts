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
    let isAdmin = isAdminPhone;

    let user: any = null;

    if (isEmail) {
      user = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (user?.role === "ADMIN") isAdmin = true;
    } else if (isAdminPhone) {
      const targetAdminEmail = cleanPhone === "7388389944"
        ? (process.env.ADMIN_EMAIL_2 || "prashantmanitripathi2003@gmail.com")
        : (process.env.ADMIN_EMAIL || "atultiwari123321@gmail.com");
      user = await prisma.user.findFirst({ where: { email: targetAdminEmail } });
      if (user && user.phone !== cleanPhone) {
        await prisma.user.update({ where: { id: user.id }, data: { phone: cleanPhone } });
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
      // Username / name search
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: identifier.trim(), mode: "insensitive" } },
            { email: { equals: identifier.toLowerCase().trim() } },
          ]
        }
      });
      if (!user) {
        const tenant = await prisma.tenant.findFirst({
          where: { name: { equals: identifier.trim(), mode: "insensitive" } },
          include: { user: true }
        });
        if (tenant) user = tenant.user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "No account found with this credential." }, { status: 404 });
    }

    if (user.role === "ADMIN") isAdmin = true;

    // Resolve final email and phone from the found user record
    if (user.email) targetEmail = user.email;
    if (user.phone) cleanPhone = user.phone.replace(/\D/g, "").slice(-10);

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs
    const orConditions: any[] = [];
    if (targetEmail) orConditions.push({ email: targetEmail, used: false });
    if (cleanPhone) orConditions.push({ phone: cleanPhone, used: false });
    if (orConditions.length > 0) {
      await prisma.otpCode.updateMany({ where: { OR: orConditions }, data: { used: true } });
    }

    // ✅ Save OTP — this is the source of truth regardless of delivery success
    await prisma.otpCode.create({
      data: { email: targetEmail || null, phone: cleanPhone || null, code, expiresAt },
    });

    console.log(`[Forgot Password] OTP for ${targetEmail || cleanPhone}: ${code}`);

    // Try Email delivery (non-blocking failure)
    let emailSent = false;
    if (targetEmail && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        emailSent = await sendEmailOTP(targetEmail, code);
      } catch (e) {
        console.error("[Forgot Password Email Error]", e);
      }
    }

    // Try WhatsApp delivery via queue (non-blocking failure)
    let whatsappQueued = false;
    if (cleanPhone) {
      try {
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = `🏢 *ATUL RESIDENCY*\n\n🔐 Your Password Reset OTP is: *${code}*\n\n⏳ Valid for 10 minutes. Please do not share with anyone.`;
        await prisma.whatsappQueue.create({
          data: { number: formattedPhone, message: msg, status: "PENDING" }
        });
        whatsappQueued = true;
        console.log(`[Forgot Password] WhatsApp OTP queued for ${formattedPhone}`);
      } catch (e) {
        console.error("[Forgot Password WhatsApp Error]", e);
      }
    }

    // Build success message based on delivery channels
    const channels: string[] = [];
    if (emailSent) channels.push("email");
    if (whatsappQueued) channels.push("WhatsApp");

    const message = channels.length > 0
      ? `OTP sent via ${channels.join(" & ")}!`
      : "OTP generated. You'll receive it shortly via WhatsApp/email.";

    return NextResponse.json({
      success: true,
      message,
      emailSent,
      whatsappQueued,
      // ✅ Always show OTP directly for admin — they own the system
      ...(isAdmin && { adminOtp: code }),
      // Show in development mode too
      ...(process.env.NODE_ENV === "development" && { devOtp: code }),
    });

  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
