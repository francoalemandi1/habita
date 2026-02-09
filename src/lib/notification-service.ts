import { prisma } from "./prisma";

import type { NotificationType, Prisma } from "@prisma/client";

interface CreateNotificationParams {
  memberId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Create a single notification for a member.
 * Fire-and-forget safe — errors are logged but never thrown.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        memberId: params.memberId,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl ?? null,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Create the same notification for multiple members.
 * Useful for household-wide events (plan ready, plan applied).
 */
export async function createNotificationForMembers(
  memberIds: string[],
  params: Omit<CreateNotificationParams, "memberId">
): Promise<void> {
  if (memberIds.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: memberIds.map((memberId) => ({
        memberId,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl ?? null,
        metadata: params.metadata ?? undefined,
      })),
    });
  } catch (error) {
    console.error("Failed to create notifications for members:", error);
  }
}

/**
 * Mark specific notifications as read.
 */
export async function markNotificationsAsRead(memberId: string, notificationIds: string[]): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      memberId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  return result.count;
}

/**
 * Mark ALL notifications as read for a member.
 */
export async function markAllNotificationsAsRead(memberId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      memberId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  return result.count;
}

/**
 * Get unread notification count for a member (lightweight query for badge).
 */
export async function getUnreadCount(memberId: string): Promise<number> {
  return prisma.notification.count({
    where: { memberId, isRead: false },
  });
}

/**
 * Delete old notifications to prevent unbounded growth.
 * - Read notifications older than 30 days
 * - Unread notifications older than 90 days
 */
export async function cleanupOldNotifications(): Promise<{ deletedRead: number; deletedUnread: number }> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [readResult, unreadResult] = await Promise.all([
    prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    }),
    prisma.notification.deleteMany({
      where: {
        isRead: false,
        createdAt: { lt: ninetyDaysAgo },
      },
    }),
  ]);

  return {
    deletedRead: readResult.count,
    deletedUnread: unreadResult.count,
  };
}
