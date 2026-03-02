import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export type PreferenceValue = "PREFERRED" | "DISLIKED";

export interface PreferenceTask {
  id: string;
  name: string;
  frequency: string;
  weight: number;
}

export interface MemberPreference {
  id: string;
  memberId: string;
  taskId: string;
  preference: PreferenceValue;
  task: PreferenceTask;
}

export interface PreferencesResponse {
  preferences: MemberPreference[];
  preferred: MemberPreference[];
  disliked: MemberPreference[];
  stats: {
    total: number;
    preferredCount: number;
    dislikedCount: number;
  };
}

// ── Query key ──────────────────────────────────────────────────────────────

const PREFS_KEY = ["mobile", "preferences"] as const;

// ── Hooks ──────────────────────────────────────────────────────────────────

export function usePreferences() {
  return useQuery({
    queryKey: PREFS_KEY,
    queryFn: async () => mobileApi.get<PreferencesResponse>("/api/preferences"),
  });
}

export function useSetPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { taskId: string; preference: PreferenceValue }) =>
      mobileApi.post("/api/preferences", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PREFS_KEY });
    },
  });
}

export function useRemovePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) =>
      mobileApi.delete(`/api/preferences?taskId=${taskId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PREFS_KEY });
    },
  });
}
