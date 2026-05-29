import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // If a real SMS API key is configured, disable this endpoint for security
    if (process.env.FAST2SMS_API_KEY) {
      return NextResponse.json(
        { error: "SMS gateway is enabled. Simulated OTP retrieval is disabled." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    const latest = await prisma.otpCode.findFirst({
      where: {
        phone: cleanPhone,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!latest) {
      return NextResponse.json({ error: "No active OTP found. Send OTP first." }, { status: 404 });
    }

    return NextResponse.json({ code: latest.code });
  } catch (error) {
    console.error("[latest-otp error]", error);
    return NextResponse.json({ error: "Failed to fetch latest OTP" }, { status: 500 });
  }
}
