import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { SerializedService, CreateServicePayload } from "@habita/contracts";

export type { SerializedService, CreateServicePayload };

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.all(),
    queryFn: async () => mobileApi.get<SerializedService[]>("/api/services"),
  });
}

export function useGenerateServiceExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) =>
      mobileApi.post(`/api/services/${serviceId}/generate`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) =>
      mobileApi.delete(`/api/services/${serviceId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all() });
    },
  });
}
