import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { TaskFrequency } from "@habita/contracts";

export interface RotationSummary {
  id: string;
  taskId: string;
  frequency: TaskFrequency;
  isActive: boolean;
  task: { id: string; name: string; frequency: TaskFrequency; weight: number };
}

const rotationsKey = ["rotations"] as const;

/** GET /api/rotations — rotationId doubles as taskId (see src/app/api/rotations/route.ts). */
export function useRotations() {
  return useQuery({
    queryKey: rotationsKey,
    queryFn: async () => mobileApi.get<{ rotations: RotationSummary[] }>("/api/rotations"),
  });
}

export function useCreateRotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) =>
      mobileApi.post<{ rotation: RotationSummary }>("/api/rotations", { taskId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rotationsKey });
    },
  });
}

export function useToggleRotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: string; isActive: boolean }) =>
      mobileApi.patch<{ rotation: RotationSummary }>(`/api/rotations/${taskId}`, { isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rotationsKey });
    },
  });
}

export function useDeleteRotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => mobileApi.delete<{ success: boolean }>(`/api/rotations/${taskId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rotationsKey });
    },
  });
}
