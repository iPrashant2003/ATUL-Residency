import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bot } = await req.json();
    if (bot !== "bot1" && bot !== "bot2") {
      return NextResponse.json({ error: "Invalid bot name" }, { status: 400 });
    }

    const botUrl = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";
    const res = await fetch(`${botUrl}/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to reset session");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[WhatsApp Logout API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to reset WhatsApp session" }, { status: 500 });
  }
}
