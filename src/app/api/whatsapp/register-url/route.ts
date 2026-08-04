import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST: Registers a new WhatsApp Bot SSH tunnel URL into Neon database
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url, secret } = body;

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
    }

    const expectedSecret = process.env.BOT_SECRET || "atul_bot_secret_2026";
    if (secret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid secret token" }, { status: 401 });
    }

    const cleanUrl = url.replace(/\/$/, "");

    // Record URL in database via Vercel serverless connection
    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_BOT_URL",
        entity: "SYSTEM",
        details: cleanUrl,
      },
    });

    console.log(`[Register URL API] Successfully registered WhatsApp Bot URL: ${cleanUrl}`);
    return NextResponse.json({ success: true, url: cleanUrl });
  } catch (err: any) {
    console.error("[Register URL API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to register URL" }, { status: 500 });
  }
}

// GET: Returns current registered WhatsApp Bot URL
export async function GET() {
  await headers();
  try {
    const latestLog = await prisma.activityLog.findFirst({
      where: { action: "WHATSAPP_BOT_URL" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      url: latestLog?.details || null,
      updatedAt: latestLog?.createdAt || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch bot URL" }, { status: 500 });
  }
}
