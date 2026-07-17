import webPush from "web-push";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    "mailto:notifications@thetapm.site",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.warn("[Push] VAPID keys not configured. Skipping push notification.");
    return { success: false };
  }

  try {
    const preference = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preference?.pushNotifications || !preference?.pushSubscription) {
      return { success: false };
    }

    const subscription = preference.pushSubscription as any;
    if (!subscription.endpoint) {
      return { success: false };
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/notifications",
      tag: "theta-notification",
    });

    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      payload
    );

    return { success: true };
  } catch (error: any) {
    if (error?.statusCode === 410 || error?.statusCode === 404) {
      await prisma.userPreference.update({
        where: { userId },
        data: { pushSubscription: null, pushNotifications: false },
      });
    }
    logger.error(`[Push] Failed to send push notification: ${error}`);
    return { success: false };
  }
}
