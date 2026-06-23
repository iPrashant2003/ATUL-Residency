import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBotUrl } from "@/lib/whatsappUrl";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const botUrl = await getBotUrl();
    const res = await fetch(`${botUrl}/logout`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true"
      },
      body: JSON.stringify({}),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Bot server returned invalid response" }, { status: 502 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Failed to reset bot" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[WhatsApp Logout API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to reset WhatsApp session" }, { status: 500 });
  }
}
