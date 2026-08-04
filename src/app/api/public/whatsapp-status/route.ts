import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getBotUrl } from "@/lib/whatsappUrl";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const headerList = await headers();

  let registerUrl = req.nextUrl?.searchParams?.get("url") ||
                    req.nextUrl?.searchParams?.get("registerUrl") ||
                    req.nextUrl?.searchParams?.get("tunnel");

  if (!registerUrl) {
    const rawUrl = (req as any).url || "";
    const match = rawUrl.match(/[?&](?:url|registerUrl|tunnel)=([^&]+)/i);
    if (match && match[1]) {
      try { registerUrl = decodeURIComponent(match[1]); } catch { registerUrl = match[1]; }
    }
  }

  if (registerUrl && registerUrl.length > 5) {
    let cleanUrl = registerUrl.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = `https://${cleanUrl}`;
    cleanUrl = cleanUrl.replace(/\/$/, "");
    
    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_BOT_URL",
        entity: "SYSTEM",
        details: cleanUrl,
      },
    });
    return NextResponse.json({ success: true, registeredUrl: cleanUrl });
  }

  try {
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
      return NextResponse.json({ isReady: false, initialized: false, error: "Bot server invalid JSON response" });
    }

    const b = rawData.bot1 || rawData;
    return NextResponse.json({
      isReady: !!(rawData.isReady || b.isReady),
      initialized: rawData.initialized !== undefined ? rawData.initialized : (b.initialized !== undefined ? b.initialized : true),
      qrImage: rawData.qrImage || b.qrImage || null,
      pairingCode: rawData.pairingCode || b.pairingCode || null,
      phone: rawData.phone || b.phone || null,
      pushname: rawData.pushname || b.pushname || null,
      _botUrl: botUrl
    });
  } catch (err: any) {
    return NextResponse.json({
      isReady: false,
      initialized: false,
      qrImage: null,
      pairingCode: null,
      phone: null,
      pushname: null,
      _error: err.name === "TimeoutError" ? "Bot server offline" : (err.message || "Unknown error")
    });
  }
}
