import { createNotification, createNotificationForMembers } from "./notification-service";
import { sendExpoPushToMember } from "./expo-push";
import { prisma } from "./prisma";

import type { NotificationType, Prisma } from "@prisma/client";
import type { ExpoPushPayload } from "./expo-push";

// ── Deep link map ──────────────────────────────────────────────────────────────

const DEEP_LINK_MAP: Partial<Record<NotificationType, string>> = {
  TRANSFER_REQUEST: "/(app)/transfers",
  TRANSFER_ACCEPTED: "/(app)/transfers",
  TRANSFER_REJECTED: "/(app)/transfers",
  SERVICE_DUE_SOON: "/(app)/services",
  EXPENSE_SHARED: "/(app)/balance",
  EXPENSE_WEEKLY_SUMMARY: "/(app)/expense-insights",
  MEMBER_JOINED: "/(app)/profile",
  PLAN_READY: "/(app)/plan",
  CULTURAL_RECOMMENDATION: "/(app)/descubrir",
  DEAL_ALERT: "/(app)/grocery-deals",
  TASK_REMINDER: "/(app)/tasks",
  DAILY_BRIEFING: "/(app)/dashboard",
  TASK_OVERDUE: "/(app)/tasks",
  SPENDING_ALERT: "/(app)/expense-insights",
  EXPENSE_REMINDER: "/(app)/new-expense",
};

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface DeliverNotificationParams {
  memberId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
  householdTimezone?: string | null;
  sendPush?: boolean;
}

interface DeliverToMembersParams {
  memberIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
  householdTimezone?: string | null;
  sendPush?: boolean;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Create an in-app notification AND send push if conditions are met.
 * Fire-and-forget safe — never throws.
 */
export async function deliverNotification(params: DeliverNotificationParams): Promise<void> {
  const { memberId, type, title, message, actionUrl, metadata, householdTimezone, sendPush } =
    params;

  // 1. In-app notification
  await createNotification({ memberId, type, title, message, actionUrl, metadata });

  // 2. Push notification (fire-and-forget)
  if (sendPush !== false) {
    const deepLink = DEEP_LINK_MAP[type];
    const pushPayload: ExpoPushPayload = {
      title,
      body: message,
      data: deepLink ? { url: deepLink } : undefined,
    };

    void sendExpoPushToMember(memberId, type, pushPayload, householdTimezone);
  }
}

/**
 * Create in-app notifications for multiple members AND send push to each.
 * Fire-and-forget safe — never throws.
 */
export async function deliverNotificationToMembers(
  params: DeliverToMembersParams,
): Promise<void> {
  const { memberIds, type, title, message, actionUrl, metadata, householdTimezone, sendPush } =
    params;

  if (memberIds.length === 0) return;

  // 1. Batch in-app notifications
  await createNotificationForMembers(memberIds, { type, title, message, actionUrl, metadata });

  // 2. Push to each member (fire-and-forget, parallel)
  if (sendPush !== false) {
    const deepLink = DEEP_LINK_MAP[type];
    const pushPayload: ExpoPushPayload = {
      title,
      body: message,
      data: deepLink ? { url: deepLink } : undefined,
    };

    void Promise.allSettled(
      memberIds.map((memberId) =>
        sendExpoPushToMember(memberId, type, pushPayload, householdTimezone),
      ),
    );
  }
}

/**
 * Helper: get household timezone for a member.
 * Useful in API routes where you have a memberId but need the timezone.
 */
export async function getHouseholdTimezone(memberId: string): Promise<string | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { household: { select: { timezone: true } } },
  });
  return member?.household.timezone ?? null;
}
