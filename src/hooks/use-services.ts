"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import { apiFetch } from "@/lib/api-client";

import type { SerializedService } from "@/types/expense";
import type { ExpenseCategory, RecurringFrequency, SplitType } from "@prisma/client";
import type { DetectedService } from "@/lib/gmail/scanner";

export interface CreateServicePayload {
  title: string;
  provider: string | null;
  accountNumber: string | null;
  lastAmount: number | null;
  category: ExpenseCategory;
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  paidById: string;
  autoGenerate: boolean;
  notes: string | null;
  splitType: SplitType;
  nextDueDate: string;
}

export type UpdateServicePayload = Partial<Omit<CreateServicePayload, "splitType" | "nextDueDate">>;

export interface GmailScanResult {
  detected: DetectedService[];
  alreadyExists: Array<{ id: string; title: string }>;
}

/** List all services for the household, including isError/refetch for the error + Reintentar state (§10). */
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.list(),
    queryFn: () => apiFetch<SerializedService[]>("/api/services"),
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateServicePayload) =>
      apiFetch<SerializedService>("/api/services", { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.services.all() }),
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServicePayload }) =>
      apiFetch<SerializedService>(`/api/services/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.services.all() }),
  });
}

export function useToggleServiceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (service: SerializedService) =>
      apiFetch<SerializedService>(`/api/services/${service.id}`, {
        method: "PATCH",
        body: { isActive: !service.isActive },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.services.all() }),
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => apiFetch(`/api/services/${serviceId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.services.all() }),
  });
}

export function useGenerateServiceExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => apiFetch(`/api/services/${serviceId}/generate`, { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.services.all() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
  });
}

/**
 * Scans Gmail for detected invoices. There is no GET status endpoint for the
 * Gmail connection (§11 — no backend changes in this stage), so this is the
 * only signal of "connected" we have; a `GMAIL_NOT_CONNECTED` error means the
 * household hasn't linked Gmail yet.
 */
export function useScanGmail() {
  return useMutation({
    mutationFn: () => apiFetch<GmailScanResult>("/api/services/scan-gmail", { method: "POST" }),
  });
}

export function useImportServices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (services: Array<Pick<DetectedService, "title" | "provider" | "category" | "frequency" | "lastAmount"> & { currency: string; accountNumber: string | null }>) =>
      apiFetch<{ imported: number }>("/api/services/import", { method: "POST", body: { services } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.services.all() }),
  });
}
