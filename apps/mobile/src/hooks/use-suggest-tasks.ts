import { useMutation } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SuggestedTask {
  name: string;
  frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  category: string;
  icon: string;
  estimatedMinutes: number;
  weight: number;
  reason?: string;
}

export interface TaskCategory {
  name: string;
  label: string;
  icon: string;
  tasks: SuggestedTask[];
}

export interface SuggestTasksResponse {
  categories: TaskCategory[];
  insights: string[];
}

export interface SuggestTasksInput {
  hasChildren?: boolean;
  hasPets?: boolean;
  location?: string;
  householdDescription?: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useSuggestTasks() {
  return useMutation({
    mutationFn: async (input: SuggestTasksInput) =>
      mobileApi.post<SuggestTasksResponse>("/api/ai/suggest-tasks", input),
  });
}
