import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  await headers();
  try {
    const url = req.nextUrl.searchParams.get("url") || req.nextUrl.searchParams.get("registerUrl") || req.nextUrl.searchParams.get("subdomain");
    
    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    if (!cleanUrl.includes(".")) {
      cleanUrl = `${cleanUrl}.lhr.life`;
    }
    cleanUrl = cleanUrl.replace(/\/$/, "");

    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_BOT_URL",
        entity: "SYSTEM",
        details: cleanUrl,
      },
    });

    console.log(`[Public Register Bot API] Registered WhatsApp Bot URL: ${cleanUrl}`);
    return NextResponse.json({ success: true, url: cleanUrl });
  } catch (err: any) {
    console.error("[Public Register Bot API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to register URL" }, { status: 500 });
  }
}
