import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type {
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

export function useCompleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) =>
      mobileApi.post<CompleteAssignmentResponse>(
        `/api/assignments/${assignmentId}/complete`,
        {},
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() });
    },
  });
}

export function useUncompleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) =>
      mobileApi.post<UncompleteAssignmentResponse>(
        `/api/assignments/${assignmentId}/uncomplete`,
        {},
      ),
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
