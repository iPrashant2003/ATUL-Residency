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
    let resolvedUser = null;

    if (isEmail) {
      targetEmail = identifier.toLowerCase().trim();
      resolvedUser = await prisma.user.findUnique({
        where: { email: targetEmail },
        include: { tenant: true },
      });
    } else {
      const digitsOnly = identifier.replace(/\D/g, "");
      if (digitsOnly.length >= 10) {
        cleanPhone = digitsOnly.slice(-10);
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
      } else {
        // Name/username case-insensitive search
        resolvedUser = await prisma.user.findFirst({
          where: { name: { equals: identifier.trim(), mode: "insensitive" } },
          include: { tenant: true }
        });
        if (!resolvedUser) {
          const dbTenant = await prisma.tenant.findFirst({
            where: {
              isActive: true,
              name: { equals: identifier.trim(), mode: "insensitive" }
            },
            include: { user: true }
          });
          if (dbTenant) {
            tenant = dbTenant;
            resolvedUser = dbTenant.user;
          }
        }
      }
    }

    if (resolvedUser) {
      if (resolvedUser.role === "ADMIN") {
        isAdmin = true;
        if (resolvedUser.phone) {
          cleanPhone = resolvedUser.phone.replace(/\D/g, "").slice(-10);
        }
        if (resolvedUser.email) {
          targetEmail = resolvedUser.email;
        }
      } else {
        const dbTenant = await prisma.tenant.findUnique({
          where: { userId: resolvedUser.id }
        });
        if (dbTenant && dbTenant.isActive) {
          tenant = dbTenant;
          cleanPhone = tenant.phone.replace(/\D/g, "").slice(-10);
          targetEmail = tenant.email || resolvedUser.email;
        }
      }
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
      try {
        const { sendEmailOTP } = await import("@/lib/mailer");
        emailSent = await sendEmailOTP(targetEmail, code);
      } catch (e) {
        console.error("[SMTP Error]", e);
      }
    }

    // 3. Send WhatsApp via active Bot (Ultra-reliable premium channel)
    let whatsappSent = false;
    const whatsappNum = tenant ? tenant.whatsapp : (cleanPhone ? `91${cleanPhone}` : null);
    const receiverName = tenant ? tenant.name : "Admin";

    if (whatsappNum) {
      try {
        // Standardize number (ensure country code 91 prefix)
        const formattedNum = whatsappNum.replace(/\D/g, "");
        const finalNum = formattedNum.startsWith("91") && formattedNum.length > 10 ? formattedNum : `91${formattedNum}`;

        const whatsappMsg = `✨ *ATUL RESIDENCY* ✨\n🔐 *Your Secure Login OTP* 🔐\n\nDear *${receiverName}*,\n\nYour One-Time Password (OTP) for secure login to the Atul Residency Portal is:\n\n➡️ *${code}* ⬅️\n\n⏳ This code is valid for *10 minutes*. For security, please do not share this OTP with anyone.\n\nThank you for choosing Atul Residency! 🏠🌟\n\nWarm regards,\n*Atul Tiwari*\nAtul Residency`;

        await prisma.whatsappQueue.create({
          data: {
            number: finalNum,
            message: whatsappMsg,
            status: "PENDING",
          },
        });
        whatsappSent = true;
        console.log(`[WhatsApp OTP] Successfully queued for ${receiverName} (${finalNum})`);
      } catch (e) {
        console.error("[WhatsApp OTP Error]", e);
      }
    }

    // Build user-friendly message based on channels
    const channels: string[] = [];
    if (whatsappSent) channels.push("WhatsApp");
    if (emailSent) channels.push("Email");
    if (smsSent) channels.push("SMS");

    const deliveryMessage = channels.length > 0
      ? `OTP sent successfully to your ${channels.join(" & ")}!`
      : "OTP generated successfully. You will receive it shortly via WhatsApp/Email.";

    return NextResponse.json({
      success: true,
      message: deliveryMessage,
      smsSent,
      emailSent,
      whatsappSent,
      // Always provide adminOtp to admin numbers/accounts so admin is never locked out
      ...(isAdmin && { adminOtp: code }),
      ...(process.env.NODE_ENV === "development" && { devOtp: code }),
    });
  } catch (err) {
    console.error("[send-otp]", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
