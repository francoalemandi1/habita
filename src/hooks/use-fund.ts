"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import { apiFetch } from "@/lib/api-client";

import type { FundState, CreateContributionPayload, CreateFundPayload, UpdateAllocationsPayload } from "@/types/fund";

/** The household's shared fund, with isError/refetch for the error + Reintentar state (§10). */
export function useFund() {
  return useQuery({
    queryKey: queryKeys.fund.all(),
    queryFn: () => apiFetch<FundState | null>("/api/fund"),
  });
}

export function useSetupFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFundPayload) => apiFetch<FundState>("/api/fund/setup", { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.fund.all() }),
  });
}

export function useContributeToFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContributionPayload) => apiFetch("/api/fund/contribute", { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.fund.all() }),
  });
}

export function useUpdateFundAllocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAllocationsPayload) => apiFetch("/api/fund/allocations", { method: "PUT", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.fund.all() }),
  });
}
