import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type {
  ApplyPlanResponse,
  PlanAssignment,
  PlanPreviewResponse,
} from "@habita/contracts";

interface PreviewInput {
  startDate: string;
  endDate: string;
}

interface ApplyInput {
  planId: string;
  assignments: PlanAssignment[];
}

export function usePreviewWeeklyPlan() {
  return useMutation({
    mutationFn: async (input: PreviewInput) =>
      mobileApi.post<PlanPreviewResponse>("/api/ai/preview-plan", input),
  });
}

export function useApplyWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ApplyInput) =>
      mobileApi.post<ApplyPlanResponse>("/api/ai/apply-plan", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() });
    },
  });
}

export function useDiscardWeeklyPlan() {
  return useMutation({
    mutationFn: async (planId: string) =>
      mobileApi.delete<{ success: boolean }>(`/api/plans/${planId}`),
  });
}

interface PlanFeedbackInput {
  planId: string;
  rating: number;
  comment?: string;
}

export function usePlanFeedback() {
  return useMutation({
    mutationFn: async ({ planId, rating, comment }: PlanFeedbackInput) =>
      mobileApi.post<{ success: boolean }>(`/api/plans/${planId}/feedback`, { rating, comment }),
  });
}

type PlanAssignmentAction = "add" | "remove" | "reassign";

interface PlanAssignmentEditInput {
  planId: string;
  action: PlanAssignmentAction;
  assignmentId?: string;
  taskId?: string;
  memberId?: string;
  newMemberId?: string;
  dayOfWeek?: number;
}

export function usePlanAssignmentEdit() {
  return useMutation({
    mutationFn: async ({ planId, ...body }: PlanAssignmentEditInput) =>
      mobileApi.patch<{ success: boolean }>(`/api/plans/${planId}/assignments`, body),
  });
}
