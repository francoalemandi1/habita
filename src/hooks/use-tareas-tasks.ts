"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@habita/contracts";

import type { Task } from "@prisma/client";

interface TasksListResponse {
  tasks: Task[];
}

export interface CreateTaskInput {
  name: string;
  frequency: string;
  weight: number;
  estimatedMinutes?: number | null;
  isRotating?: boolean;
}

export interface UpdateTaskInput {
  name?: string;
  frequency?: string;
  weight?: number;
  estimatedMinutes?: number | null;
}

export function useTareasTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: () => apiFetch<TasksListResponse>("/api/tasks?limit=100"),
  });
}

export function useTareasTaskMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
  // Task edits are embedded in assignment cards too, so the week view must refetch them as well.
  const invalidateWide = () => {
    invalidate();
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all() });
  };

  const create = useMutation({
    mutationFn: (input: CreateTaskInput) => apiFetch("/api/tasks", { method: "POST", body: input }),
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      apiFetch(`/api/tasks/${taskId}`, { method: "PATCH", body: input }),
    onSettled: invalidateWide,
  });

  const remove = useMutation({
    mutationFn: (taskId: string) => apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" }),
    onSettled: invalidate,
  });

  return { create, update, remove };
}
