import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/config";

interface NotificationPreference {
  category: string;
  label: string;
  enabled: boolean;
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await mobileApi.get<{ preferences: NotificationPreference[] }>(
        "/api/notification-preferences",
      );
      return res.preferences;
    },
  });
}

export function useToggleNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, enabled }: { category: string; enabled: boolean }) => {
      await mobileApi.patch("/api/notification-preferences", { category, enabled });
    },
    onMutate: async ({ category, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences"] });
      const previous = queryClient.getQueryData<NotificationPreference[]>(["notification-preferences"]);

      queryClient.setQueryData<NotificationPreference[]>(["notification-preferences"], (old) =>
        old?.map((p) => (p.category === category ? { ...p, enabled } : p)),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification-preferences"], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
