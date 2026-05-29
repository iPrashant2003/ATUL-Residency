import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const botUrl = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";
    const res = await fetch(`${botUrl}/status`);
    if (!res.ok) throw new Error("Bot server down");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ isReady: false, error: "Bot server is not running" });
  }
}
