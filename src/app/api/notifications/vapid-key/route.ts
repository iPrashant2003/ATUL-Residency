import { NextResponse } from "next/server";

export async function GET() {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return NextResponse.json(
        { error: "VAPID public key not configured" },
        { status: 500 }
      );
    }
    return NextResponse.json({ publicKey: vapidPublicKey });
  } catch (error: any) {
    console.error("VAPID key endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
