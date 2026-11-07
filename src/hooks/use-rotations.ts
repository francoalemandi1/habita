"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

import type { TaskFrequency } from "@prisma/client";

export interface RotationTaskView {
  id: string;
  taskId: string;
  frequency: TaskFrequency;
  isActive: boolean;
  task: { id: string; name: string; frequency: TaskFrequency; weight: number };
}

interface RotationsListResponse {
  rotations: RotationTaskView[];
}

const ROTATIONS_QUERY_KEY = ["rotations", "list"] as const;

export function useRotationsList() {
  return useQuery({
    queryKey: ROTATIONS_QUERY_KEY,
    queryFn: () => apiFetch<RotationsListResponse>("/api/rotations"),
  });
}

export function useRotationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ROTATIONS_QUERY_KEY });

  const create = useMutation({
    mutationFn: (taskId: string) => apiFetch("/api/rotations", { method: "POST", body: { taskId } }),
    onSettled: invalidate,
  });

  const setActive = useMutation({
    mutationFn: ({ rotationId, isActive }: { rotationId: string; isActive: boolean }) =>
      apiFetch(`/api/rotations/${rotationId}`, { method: "PATCH", body: { isActive } }),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (rotationId: string) => apiFetch(`/api/rotations/${rotationId}`, { method: "DELETE" }),
    onSettled: invalidate,
  });

  return { create, setActive, remove };
}
