import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { SerializedService, CreateServicePayload } from "@habita/contracts";

export type { SerializedService, CreateServicePayload };

export type UpdateServicePayload = Partial<Omit<CreateServicePayload, "nextDueDate">>;

export interface DetectedServicePayload {
  title: string;
  provider: string;
  category: string;
  frequency: string;
  lastAmount: number | null;
  currency: string;
  accountNumber: string | null;
}

export interface GmailScanResult {
  detected: Array<DetectedServicePayload & { senderEmail: string; dueDate: string | null; clientNumber: string | null }>;
  alreadyExists: Array<{ id: string; title: string }>;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.all(),
    queryFn: async () => mobileApi.get<SerializedService[]>("/api/services"),
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateServicePayload) => mobileApi.post<SerializedService>("/api/services", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all() });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateServicePayload }) =>
      mobileApi.patch<SerializedService>(`/api/services/${id}`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all() });
    },
  });
}

export function useToggleServiceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (service: SerializedService) =>
      mobileApi.patch<SerializedService>(`/api/services/${service.id}`, { isActive: !service.isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all() });
    },
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

/**
 * Scans Gmail for detected invoices. There is no GET status endpoint for the
 * Gmail connection (§11 — no backend changes in this stage); a
 * `GMAIL_NOT_CONNECTED` error code means the household hasn't linked Gmail.
 */
export function useScanGmail() {
  return useMutation({
    mutationFn: async () => mobileApi.post<GmailScanResult>("/api/services/scan-gmail", {}),
  });
}
