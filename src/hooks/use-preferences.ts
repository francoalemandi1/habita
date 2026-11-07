"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

import type { PreferenceType } from "@/lib/validations/preferences";

/** §5.3 Disponibilidad → preferencias — Sí/No per task, POST sets, DELETE clears. */
export function useSetTaskPreference() {
  return useMutation({
    mutationFn: (input: { taskId: string; preference: PreferenceType }) =>
      apiFetch("/api/preferences", { method: "POST", body: input }),
  });
}

export function useClearTaskPreference() {
  return useMutation({
    mutationFn: (taskId: string) => apiFetch(`/api/preferences?taskId=${taskId}`, { method: "DELETE" }),
  });
}
