import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { RouletteAssignInput, RouletteAssignResult } from "@habita/contracts";

export type { RouletteAssignInput, RouletteAssignResult };

// ── Hook ───────────────────────────────────────────────────────────────────

export function useRouletteAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RouletteAssignInput) =>
      mobileApi.post<RouletteAssignResult>("/api/roulette/assign", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all() });
    },
  });
}
