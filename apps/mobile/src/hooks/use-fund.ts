import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types (mirrors src/types/fund.ts in the web app) ──────────────────────

export interface MemberContributionStatus {
  memberId: string;
  memberName: string;
  allocation: number;
  contributed: number;
  pending: number;
}

export interface FundExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
  expenseId: string | null;
}

export interface FundContributionItem {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  period: string;
  notes: string | null;
  createdAt: string;
}

export interface FundState {
  id: string;
  name: string;
  currency: string;
  monthlyTarget: number | null;
  fundCategories: string[];
  isActive: boolean;
  balance: number;
  totalContributedAllTime: number;
  totalSpentAllTime: number;
  currentPeriod: string;
  contributedThisPeriod: number;
  spentThisPeriod: number;
  memberStatuses: MemberContributionStatus[];
  recentExpenses: FundExpenseItem[];
  recentContributions: FundContributionItem[];
}

export interface CreateContributionPayload {
  amount: number;
  period?: string;
  notes?: string;
}

export interface CreateFundExpensePayload {
  title: string;
  amount: number;
  category?: string;
  date?: string;
  notes?: string;
}

export interface CreateFundPayload {
  name?: string;
  monthlyTarget?: number | null;
  fundCategories?: string[];
  allocations?: Array<{ memberId: string; amount: number }>;
}

// ── Query keys ─────────────────────────────────────────────────────────────

const FUND_KEY = ["mobile", "fund"] as const;

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useFund() {
  return useQuery({
    queryKey: FUND_KEY,
    queryFn: async () => mobileApi.get<FundState | null>("/api/fund"),
  });
}

export function useSetupFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFundPayload) =>
      mobileApi.post<FundState>("/api/fund/setup", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FUND_KEY });
    },
  });
}

export function useContributeToFund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateContributionPayload) =>
      mobileApi.post("/api/fund/contribute", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FUND_KEY });
    },
  });
}

export function useAddFundExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFundExpensePayload) =>
      mobileApi.post("/api/fund/expenses", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FUND_KEY });
    },
  });
}
