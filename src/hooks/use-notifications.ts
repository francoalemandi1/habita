"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import { apiFetch } from "@/lib/api-client";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actionUrl: string | null;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

/** §5.3 Avisos → Novedades — list + mark-all-as-read, following the PendingTransfersList pattern. */
export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => apiFetch<NotificationsResponse>("/api/notifications"),
  });

  const markAllAsRead = useMutation({
    mutationFn: () => apiFetch("/api/notifications", { method: "PATCH", body: { all: true } }),
    onSuccess: () => {
      queryClient.setQueryData<NotificationsResponse | undefined>(queryKeys.notifications.list(), (current) =>
        current ? { ...current, unreadCount: 0, notifications: current.notifications.map((n) => ({ ...n, isRead: true })) } : current,
      );
    },
  });

  return { ...query, markAllAsRead };
}
