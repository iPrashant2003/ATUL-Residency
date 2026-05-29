import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import os from "os";

function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const port = host.split(":")[1] || "3000";
    const lanIp = getLanIp();

    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    const baseUrl = isLocalhost
      ? `http://${lanIp}:${port}` 
      : `https://${host}`;

    // Persist non-localhost base URLs for the background WhatsApp process
    if (!isLocalhost) {
      try {
        const fs = require("fs");
        const configPath = require("path").join(process.cwd(), "app-config.json");
        fs.writeFileSync(configPath, JSON.stringify({ baseUrl }));
      } catch (err) {
        console.error("Failed to save app-config.json:", err);
      }
    }

    return NextResponse.json({
      lanIp,
      port,
      baseUrl
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get config" }, { status: 500 });
  }
}
