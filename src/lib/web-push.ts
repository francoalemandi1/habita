import webpush from "web-push";
import { prisma } from "./prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@habita.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push notification to a single subscription.
 * Returns false if the subscription is invalid (410 Gone) and should be removed.
 */
async function sendToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired or invalid — remove it
      return false;
    }
    console.error("Push notification send error:", error);
    return true; // Keep subscription, might be a transient error
  }
}

/**
 * Send a push notification to all subscriptions of a member.
 * Automatically cleans up expired subscriptions.
 */
export async function sendPushToMember(
  memberId: string,
  payload: PushPayload
): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { memberId },
  });

  if (subscriptions.length === 0) return 0;

  const toDelete: string[] = [];

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const success = await sendToSubscription(sub, payload);
      if (!success) {
        toDelete.push(sub.id);
      }
      return success;
    })
  );

  const sent = results.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;

  // Clean up invalid subscriptions
  if (toDelete.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  return sent;
}

/**
 * Send push notifications to all members of a household that have subscriptions.
 */
export async function sendPushToHousehold(
  householdId: string,
  payload: PushPayload
): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;

  const members = await prisma.member.findMany({
    where: { householdId, isActive: true },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    members.map((m) => sendPushToMember(m.id, payload))
  );

  return results.reduce(
    (total, r) => total + (r.status === "fulfilled" ? r.value : 0),
    0
  );
}
