import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const secret = searchParams.get("secret");

    const expectedSecret = process.env.BOT_SECRET || "atul_bot_secret_2026";
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid secret" }, { status: 401 });
    }

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL parameter" }, { status: 400 });
    }

    const cleanUrl = url.replace(/\/$/, "");

    // Save active SSH tunnel URL directly to Neon DB in cloud
    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_BOT_URL",
        entity: "SYSTEM",
        details: cleanUrl,
      },
    });

    console.log(`[Public Register Bot API] Registered WhatsApp Bot URL: ${cleanUrl}`);
    return NextResponse.json({ success: true, url: cleanUrl });
  } catch (err: any) {
    console.error("[Public Register Bot API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to register URL" }, { status: 500 });
  }
}
