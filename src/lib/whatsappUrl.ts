import { prisma } from "./prisma";

/**
 * Dynamically resolves the WhatsApp bot URL.
 * It first checks the database ActivityLog for a registered tunnel URL (updated on bot startup).
 * If not found or older than 24 hours, it falls back to the environment variable or localhost.
 */
export async function getBotUrl(): Promise<string> {
  try {
    const latestLog = await prisma.activityLog.findFirst({
      where: { action: "WHATSAPP_BOT_URL" },
      orderBy: { createdAt: "desc" },
    });

    if (latestLog && latestLog.details) {
      // Ensure the URL registration is fresh (less than 24 hours old)
      const ageMs = new Date().getTime() - new Date(latestLog.createdAt).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        return latestLog.details;
      }
    }
  } catch (err) {
    console.error("Error querying WHATSAPP_BOT_URL from database:", err);
  }

  return process.env.WHATSAPP_BOT_URL || "http://localhost:3001";
}
