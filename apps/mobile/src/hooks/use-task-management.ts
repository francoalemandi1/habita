import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type {
  CreateTaskInput,
  TaskSummary,
  TasksListResponse,
  CatalogTask,
  CatalogCategory,
  CatalogResponse,
} from "@habita/contracts";

export type { CatalogTask, CatalogCategory, CatalogResponse };

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


export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.all(),
    queryFn: async () => mobileApi.get<TasksListResponse>("/api/tasks?limit=100&offset=0"),
  });
}

export function useTaskCatalog() {
  return useQuery({
    queryKey: queryKeys.tasks.catalog(),
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) =>
      mobileApi.delete<{ success: boolean }>(`/api/tasks/${taskId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
    },
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssignmentInput) =>
      mobileApi.post<CreateAssignmentResponse>("/api/assignments", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() });
    },
  });
}
