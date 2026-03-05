import { useMutation } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type {
  SuggestedTask,
  TaskCategoryGroup,
  SuggestTasksResponse,
  SuggestTasksInput,
} from "@habita/contracts";

export type { SuggestedTask, TaskCategoryGroup, SuggestTasksResponse, SuggestTasksInput };

// ── Hook ───────────────────────────────────────────────────────────────────

export function useSuggestTasks() {
  return useMutation({
    mutationFn: async (input: SuggestTasksInput) =>
      mobileApi.post<SuggestTasksResponse>("/api/ai/suggest-tasks", input),
  });
}
