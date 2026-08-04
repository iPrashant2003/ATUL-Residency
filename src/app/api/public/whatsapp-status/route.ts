import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getBotUrl } from "@/lib/whatsappUrl";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Public endpoint for checking WhatsApp bot status & QR code from cloud
export async function GET(req: NextRequest) {
  await headers();
  try {
    const registerUrl = req.nextUrl.searchParams.get("url") || req.nextUrl.searchParams.get("registerUrl");
    if (registerUrl && registerUrl.startsWith("http")) {
      const cleanUrl = registerUrl.replace(/\/$/, "");
      await prisma.activityLog.create({
        data: {
          action: "WHATSAPP_BOT_URL",
          entity: "SYSTEM",
          details: cleanUrl,
        },
      });
      return NextResponse.json({ success: true, url: cleanUrl });
    }

    const botUrl = await getBotUrl();
    const res = await fetch(`${botUrl}/status`, {
      headers: {
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true"
      },
      signal: AbortSignal.timeout(8000),
    });

    const text = await res.text();
    let rawData: any;
    try {
      rawData = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Bot server returned invalid response" }, { status: 502 });
    }

    const b = rawData.bot1 || rawData;
    return NextResponse.json({
      isReady: !!(rawData.isReady || b.isReady),
      initialized: rawData.initialized !== undefined ? rawData.initialized : (b.initialized !== undefined ? b.initialized : true),
      qrImage: rawData.qrImage || b.qrImage || null,
      pairingCode: rawData.pairingCode || b.pairingCode || null,
      phone: rawData.phone || b.phone || null,
      pushname: rawData.pushname || b.pushname || null,
      botUrl,
      bot1: b,
    });
  } catch (err: any) {
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
