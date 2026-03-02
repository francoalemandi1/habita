import { z } from "zod";

export const notificationSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  actionUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
});

export const markNotificationsResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export type NotificationItem = z.infer<typeof notificationSchema>;
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;
export type MarkNotificationsResponse = z.infer<typeof markNotificationsResponseSchema>;
