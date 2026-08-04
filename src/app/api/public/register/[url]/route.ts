import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ url: string }> }) {
  try {
    const resolvedParams = await params;
    let targetUrl = decodeURIComponent(resolvedParams.url);
    if (!targetUrl.startsWith("http")) {
      targetUrl = `https://${targetUrl}`;
    }
    const cleanUrl = targetUrl.replace(/\/$/, "");

    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_BOT_URL",
        entity: "SYSTEM",
        details: cleanUrl,
      },
    });

    console.log(`[Public Register Dynamic Route] Successfully registered Bot URL: ${cleanUrl}`);
    return NextResponse.json({ success: true, registeredUrl: cleanUrl });
  } catch (error: any) {
    console.error("[Public Register Error]", error);
    return NextResponse.json({ error: error.message || "Failed to register URL" }, { status: 500 });
  }
}
