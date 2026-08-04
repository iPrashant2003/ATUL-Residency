import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  await headers();
  try {
    const rawUrl = req.nextUrl.searchParams.get("url") || req.nextUrl.searchParams.get("subdomain") || req.nextUrl.searchParams.get("tunnel");
    if (!rawUrl) {
      return NextResponse.json({ error: "Missing url or subdomain parameter" }, { status: 400 });
    }

    let cleanUrl = rawUrl.trim();
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

    console.log(`[Public Register API] Registered Bot URL: ${cleanUrl}`);
    return NextResponse.json({ success: true, registeredUrl: cleanUrl });
  } catch (error: any) {
    console.error("[Public Register Error]", error);
    return NextResponse.json({ error: error.message || "Failed to register URL" }, { status: 500 });
  }
}
