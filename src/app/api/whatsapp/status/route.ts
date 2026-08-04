import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBotUrl } from "@/lib/whatsappUrl";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Allow SSH tunnel HTTPS certificates without TLS rejection error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// POST: Allows local WhatsApp bot to register its live SSH tunnel URL
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

    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_BOT_URL",
        entity: "SYSTEM",
        details: cleanUrl,
      },
    });

    console.log(`[WhatsApp Status API] Registered SSH Tunnel URL: ${cleanUrl}`);
    return NextResponse.json({ success: true, url: cleanUrl });
  } catch (err: any) {
    console.error("[WhatsApp Status POST Error]", err);
    return NextResponse.json({ error: err.message || "Failed to register URL" }, { status: 500 });
  }
}

export async function GET() {
  await headers();
  let session = null;
  try {
    session = await auth();
  } catch (e) {}

  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const botUrl = await getBotUrl();
    const res = await fetch(`${botUrl}/status`, {
      headers: { 
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true"
      },
      // Short timeout — status should respond instantly
      signal: AbortSignal.timeout(8000),
    });

    const text = await res.text();
    let rawData: any;
    try {
      rawData = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Bot server is not responding correctly" }, { status: 502 });
    }

    // Unwrap bot1 if present so initialized, isReady, qrImage exist at root level
    const b = rawData.bot1 || rawData;
    const data = {
      isReady: !!(rawData.isReady || b.isReady),
      initialized: rawData.initialized !== undefined ? rawData.initialized : (b.initialized !== undefined ? b.initialized : true),
      qrImage: rawData.qrImage || b.qrImage || null,
      pairingCode: rawData.pairingCode || b.pairingCode || null,
      phone: rawData.phone || b.phone || null,
      pushname: rawData.pushname || b.pushname || null,
      bot1: b,
    };

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[WhatsApp Status API Error]", err);
    // Return a safe offline response rather than an error — UI handles gracefully
    return NextResponse.json({
      isReady: false,
      initialized: false,
      qrImage: null,
      pairingCode: null,
      phone: null,
      pushname: null,
      bot1: { isReady: false, initialized: false, qrImage: null, pairingCode: null, phone: null, pushname: null },
      _error: err.name === "TimeoutError" ? "Bot server is offline or unreachable" : (err.message || "Unknown error"),
    });
  }
}
