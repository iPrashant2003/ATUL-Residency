import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUpiConfig, saveUpiConfig } from "@/lib/upiStore";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getUpiConfig();
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Failed to fetch UPI config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { upiId, upiName } = await req.json();
    if (!upiId || !upiName) {
      return NextResponse.json({ error: "UPI ID and Display Name are required" }, { status: 400 });
    }

    const success = saveUpiConfig({ upiId, upiName });
    if (!success) {
      return NextResponse.json({ error: "Failed to save config on server" }, { status: 500 });
    }

    return NextResponse.json({ success: true, upiId, upiName });
  } catch {
    return NextResponse.json({ error: "Failed to save UPI config" }, { status: 500 });
  }
}
