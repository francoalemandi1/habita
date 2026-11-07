import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mobileApi } from "@/lib/api";
import { OFFLINE_MUTATION_KEYS } from "@/lib/offline-mutation-keys";

import { queryKeys } from "@habita/contracts";
import type {
  AssignmentSummary,
  CompleteAssignmentResponse,
  MyAssignmentsResponse,
  UncompleteAssignmentResponse,
} from "@habita/contracts";

interface VerifyAssignmentInput {
  assignmentId: string;
  approved: boolean;
  feedback?: string;
}

interface VerifyAssignmentResponse {
  success: boolean;
  status: string;
}


export function useMyAssignments() {
  return useQuery({
    queryKey: queryKeys.assignments.my(),
    queryFn: async () => mobileApi.get<MyAssignmentsResponse>("/api/assignments/my"),
    staleTime: 0,
  });
}

/** Standalone (no React) so it can be registered via `setMutationDefaults` and survive an app restart. */
export const completeAssignmentMutationFn = async (assignmentId: string) =>
  mobileApi.post<CompleteAssignmentResponse>(`/api/assignments/${assignmentId}/complete`, {});

export const uncompleteAssignmentMutationFn = async (assignmentId: string) =>
  mobileApi.post<UncompleteAssignmentResponse>(`/api/assignments/${assignmentId}/uncomplete`, {});

export function useCompleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.completeAssignment,
    mutationFn: completeAssignmentMutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() });
    },
  });
}

export function useUncompleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.uncompleteAssignment,
    mutationFn: uncompleteAssignmentMutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() });
    },
  });
}

export function useVerifyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, approved, feedback }: VerifyAssignmentInput) =>
      mobileApi.post<VerifyAssignmentResponse>(
        `/api/assignments/${assignmentId}/verify`,
        { approved, feedback },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() });
    },
  });
}

interface UpdateAssignmentInput {
  assignmentId: string;
  dueDate?: string;
  memberId?: string;
}

interface UpdateAssignmentResponse {
  assignment: AssignmentSummary;
}

/** PATCH /api/assignments/[id] — "Cambiar día" / direct reassignment (handoff §7 pattern A). */
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, ...body }: UpdateAssignmentInput) =>
      mobileApi.patch<UpdateAssignmentResponse>(`/api/assignments/${assignmentId}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all() });
    },
  });
}

/** DELETE /api/assignments/[id] — "Eliminar" (handoff §7 pattern A, deferred client-side). */
export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) =>
      mobileApi.delete<{ success: boolean }>(`/api/assignments/${assignmentId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all() });
    },
  });
}
