import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBotUrl } from "@/lib/whatsappUrl";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bot, phone } = await req.json();
    if (!bot || !phone) {
      return NextResponse.json({ error: "Bot name and phone number are required" }, { status: 400 });
    }

    const botUrl = await getBotUrl();
    const res = await fetch(`${botUrl}/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot, phone }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to request pairing code");
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[WhatsApp Pair API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to request pairing code" }, { status: 500 });
  }
}
