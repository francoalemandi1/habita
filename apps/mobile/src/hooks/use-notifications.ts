import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { MarkNotificationsResponse, NotificationsResponse } from "@habita/contracts";

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications.list(unreadOnly),
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}
