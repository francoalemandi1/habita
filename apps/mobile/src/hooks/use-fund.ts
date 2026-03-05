import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type {
  MemberContributionStatus,
  SerializedFundExpense,
  SerializedFundContribution,
  FundState,
  CreateContributionPayload,
  CreateFundExpensePayload,
  CreateFundPayload,
} from "@habita/contracts";

export type {
  MemberContributionStatus,
  SerializedFundExpense,
  SerializedFundContribution,
  FundState,
  CreateContributionPayload,
  CreateFundExpensePayload,
  CreateFundPayload,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useFund() {
  return useQuery({
    queryKey: queryKeys.fund.all(),
    queryFn: async () => mobileApi.get<FundState | null>("/api/fund"),
  });
}

export function useSetupFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFundPayload) =>
      mobileApi.post<FundState>("/api/fund/setup", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.fund.all() });
    },
  });
}

export function useContributeToFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateContributionPayload) =>
      mobileApi.post("/api/fund/contribute", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.fund.all() });
    },
  });
}

export function useAddFundExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFundExpensePayload) =>
      mobileApi.post("/api/fund/expenses", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.fund.all() });
    },
  });
}
