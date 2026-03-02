import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { MarkNotificationsResponse, NotificationsResponse } from "@habita/contracts";

const NOTIFICATIONS_KEY = ["mobile", "notifications"] as const;

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, unreadOnly] as const,
    queryFn: async () =>
      mobileApi.get<NotificationsResponse>(
        `/api/notifications?limit=30&unreadOnly=${unreadOnly ? "true" : "false"}`,
      ),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      mobileApi.patch<MarkNotificationsResponse>("/api/notifications", {
        all: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
