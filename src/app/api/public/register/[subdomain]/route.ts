import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    
    // Clean up domain if protocol was passed or encoded
    const cleanSubdomain = decodeURIComponent(subdomain).replace(/^https?:\/\//, "").replace(/\/$/, "");
    const fullUrl = `https://${cleanSubdomain}`;

    // Write registered tunnel URL directly to Neon DB
    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_BOT_URL",
        entity: "SYSTEM",
        details: fullUrl,
      },
    });

    console.log(`[Public Register Subdomain API] Registered WhatsApp Bot URL: ${fullUrl}`);
    return NextResponse.json({ success: true, url: fullUrl });
  } catch (err: any) {
    console.error("[Public Register Subdomain API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to register URL" }, { status: 500 });
  }
}
