"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface NotificationPreferenceItem {
  category: string;
  label: string;
  enabled: boolean;
}

interface NotificationPreferencesResponse {
  preferences: NotificationPreferenceItem[];
}

const QUERY_KEY = ["notification-preferences"] as const;

/** §5.3 Perfil → Avisos — per-category toggles, pattern A (optimistic, instant). */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<NotificationPreferencesResponse>("/api/notification-preferences"),
  });

  const setPreference = useMutation({
    mutationFn: (input: { category: string; enabled: boolean }) =>
      apiFetch("/api/notification-preferences", { method: "PATCH", body: input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationPreferencesResponse>(QUERY_KEY);
      queryClient.setQueryData<NotificationPreferencesResponse | undefined>(QUERY_KEY, (current) =>
        current
          ? { preferences: current.preferences.map((p) => (p.category === input.category ? { ...p, enabled: input.enabled } : p)) }
          : current,
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
    },
  });

  return { ...query, setPreference };
}
