import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RouletteAssignInput {
  memberId: string;
  taskId?: string;
  customTaskName?: string;
  customTaskWeight?: number;
  customTaskFrequency?: string;
  customTaskEstimatedMinutes?: number;
}

export interface RouletteAssignResult {
  assignment: {
    id: string;
    taskId: string;
    memberId: string;
    status: string;
    dueDate: string;
    task: { id: string; name: string; weight: number; frequency: string };
    member: { id: string; name: string; memberType: string };
  };
  taskName: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useRouletteAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RouletteAssignInput) =>
      mobileApi.post<RouletteAssignResult>("/api/roulette/assign", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mobile", "assignments"] });
    },
  });
}
