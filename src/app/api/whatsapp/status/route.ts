import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBotUrl } from "@/lib/whatsappUrl";

export async function GET() {
  const session = await auth();
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
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Bot server is not responding correctly" }, { status: 502 });
    }

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
