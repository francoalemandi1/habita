import { cache } from "react";
import { prisma } from "./prisma";

/**
 * Bell dot: unread novedades or a task someone passed to me that is still waiting
 * for an answer. Memoized per request — the layout (sidebar) and Casa (mobile header) both read it.
 */
export const hasPendingAvisos = cache(async (memberId: string): Promise<boolean> => {
  const [unreadCount, pendingTransferCount] = await Promise.all([
    prisma.notification.count({ where: { memberId, isRead: false } }),
    prisma.taskTransfer.count({ where: { toMemberId: memberId, status: "PENDING" } }),
  ]);
  return unreadCount + pendingTransferCount > 0;
});
