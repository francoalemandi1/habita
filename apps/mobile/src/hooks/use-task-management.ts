import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { CreateTaskInput, TaskSummary, TasksListResponse } from "@habita/contracts";

interface CreateTaskResponse {
  task: TaskSummary;
}

interface CreateAssignmentResponse {
  assignment: {
    id: string;
  };
}

interface CreateAssignmentInput {
  taskId: string;
  memberId: string;
  dueDate: string;
  notes?: string;
}

export interface CatalogTask {
  name: string;
  icon: string;
  defaultFrequency: string;
  defaultWeight: number;
  estimatedMinutes: number | null;
  minAge: number | null;
}

export interface CatalogCategory {
  category: string;
  label: string;
  icon: string;
  tasks: CatalogTask[];
}

interface CatalogResponse {
  categories: CatalogCategory[];
}

const TASKS_QUERY_KEY = ["mobile", "tasks"] as const;
const CATALOG_QUERY_KEY = ["mobile", "tasks", "catalog"] as const;
const ASSIGNMENTS_QUERY_KEY = ["mobile", "assignments", "my"] as const;

export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async () => mobileApi.get<TasksListResponse>("/api/tasks?limit=100&offset=0"),
  });
}

export function useTaskCatalog() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: async () => mobileApi.get<CatalogResponse>("/api/tasks/catalog"),
    staleTime: 10 * 60 * 1000, // catalog changes rarely
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) =>
      mobileApi.post<CreateTaskResponse>("/api/tasks", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssignmentInput) =>
      mobileApi.post<CreateAssignmentResponse>("/api/assignments", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY });
    },
  });
}
