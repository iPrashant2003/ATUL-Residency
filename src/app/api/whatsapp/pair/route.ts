import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBotUrl } from "@/lib/whatsappUrl";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Allow up to 60s — WhatsApp can take 40s+ to return a pairing code
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const botUrl = await getBotUrl();

    // Use AbortController so we never hang longer than 55s
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    let res: Response;
    try {
      res = await fetch(`${botUrl}/pair`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({ phone }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[Pair] Bot server returned non-JSON:", text.slice(0, 200));
      return NextResponse.json({ error: "Bot server returned an invalid response. Is the bot running?" }, { status: 502 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Failed to get pairing code" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[WhatsApp Pair API Error]", err);
    const msg = err.name === "AbortError"
      ? "Timed out waiting for pairing code — please try again"
      : (err.message || "Failed to request pairing code");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
