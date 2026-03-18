import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";
import { queryKeys } from "@habita/contracts";

export interface PlanSummary {
  id: string;
  status: "PENDING" | "APPLIED" | "COMPLETED" | "EXPIRED" | "REJECTED";
  balanceScore: number;
  durationDays: number;
  assignments: Array<{
    taskName: string;
    memberId?: string;
    memberName: string;
    memberType: string;
    reason: string;
    dayOfWeek?: number;
  }>;
  notes: string[];
  createdAt: string;
  appliedAt: string | null;
  expiresAt: string;
}

export function usePlanHistory() {
  return useQuery({
    queryKey: queryKeys.plans.list(),
    queryFn: async () => mobileApi.get<PlanSummary[]>("/api/plans"),
  });
}
