import webpush from "web-push";
import { prisma } from "./prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidMailto = process.env.VAPID_MAILTO || "mailto:atultiwari123321@gmail.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidMailto,
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  urlPath?: string
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys not configured. Skipping push notification.");
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: {
        url: urlPath || "/",
      },
    });

    const sendPromises = subscriptions.map((sub) => {
      const subscriptionObj = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      return webpush
        .sendNotification(subscriptionObj, payload)
        .catch(async (err) => {
          console.error("Failed to send push notification to subscription:", sub.id, err.message);
          // If subscription is expired or invalid (404 / 410 Gone), prune from database
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            }).catch(() => {});
          }
        });
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("Error in sendPushNotification:", error);
  }
}
