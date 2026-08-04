import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ url: string }> }) {
  try {
    const resolvedParams = await params;
    const rawParam = decodeURIComponent(resolvedParams.url);
    // Remove any dots/slashes and reconstruct standard lhr.life domain
    const cleanSubdomain = rawParam.split(".")[0].replace(/[^a-z0-9]/gi, "");
    const cleanUrl = `https://${cleanSubdomain}.lhr.life`;

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
