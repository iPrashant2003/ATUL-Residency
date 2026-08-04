import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (url && url.startsWith("http")) {
    const cleanUrl = url.replace(/\/$/, "");
    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_BOT_URL",
        entity: "SYSTEM",
        details: cleanUrl,
      },
    });
    return NextResponse.json({ success: true, url: cleanUrl });
  }
  return NextResponse.json({ error: "Missing or invalid url parameter" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url;
    if (url && url.startsWith("http")) {
      const cleanUrl = url.replace(/\/$/, "");
      await prisma.activityLog.create({
        data: {
          action: "WHATSAPP_BOT_URL",
          entity: "SYSTEM",
          details: cleanUrl,
        },
      });
      return NextResponse.json({ success: true, url: cleanUrl });
    }
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
