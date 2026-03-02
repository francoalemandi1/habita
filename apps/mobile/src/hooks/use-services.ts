import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types (mirrors SerializedService from the web app) ────────────────────

export interface ServicePaidBy {
  id: string;
  name: string;
}

export interface SerializedService {
  id: string;
  title: string;
  provider: string | null;
  accountNumber: string | null;
  lastAmount: number | null;
  currency: string;
  category: string;
  splitType: string;
  paidById: string;
  paidBy: ServicePaidBy;
  notes: string | null;
  frequency: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  autoGenerate: boolean;
  nextDueDate: string;
  lastGeneratedAt: string | null;
  isActive: boolean;
}

export interface CreateServicePayload {
  title: string;
  provider?: string;
  accountNumber?: string;
  lastAmount?: number;
  category?: string;
  splitType?: string;
  paidById: string;
  notes?: string;
  frequency: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  autoGenerate?: boolean;
  nextDueDate: string;
}

// ── Query keys ─────────────────────────────────────────────────────────────

const SERVICES_KEY = ["mobile", "services"] as const;

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useServices() {
  return useQuery({
    queryKey: SERVICES_KEY,
    queryFn: async () => mobileApi.get<SerializedService[]>("/api/services"),
  });
}

export function useGenerateServiceExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) =>
      mobileApi.post(`/api/services/${serviceId}/generate`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
      await queryClient.invalidateQueries({ queryKey: ["mobile-expenses"] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) =>
      mobileApi.delete(`/api/services/${serviceId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
    },
  });
}
