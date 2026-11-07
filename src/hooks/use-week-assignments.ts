"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@habita/contracts";
import { OFFLINE_MUTATION_KEYS } from "@/lib/offline-mutation-keys";
import { offlineMutationRetry } from "@/lib/offline-network";

import type { AssignmentPatch } from "@/lib/tareas-week";
import type { AssignmentStatus, MemberType, TaskFrequency } from "@prisma/client";

export interface WeekAssignmentTask {
  id: string;
  name: string;
  weight: number;
  frequency: TaskFrequency;
  estimatedMinutes: number | null;
}

export interface WeekAssignmentMember {
  id: string;
  name: string;
  memberType: MemberType;
}

export interface WeekAssignment {
  id: string;
  taskId: string;
  memberId: string;
  completedByMemberId: string | null;
  dueDate: string;
  status: AssignmentStatus;
  task: WeekAssignmentTask;
  member: WeekAssignmentMember;
}

interface AssignmentsListResponse {
  assignments: WeekAssignment[];
}

function weekQueryKey(mondayISO: string) {
  return [...queryKeys.assignments.all(), "week", mondayISO] as const;
}

export function useWeekAssignments(mondayISO: string, sundayISO: string) {
  return useQuery({
    queryKey: weekQueryKey(mondayISO),
    queryFn: () =>
      apiFetch<AssignmentsListResponse>(
        `/api/assignments?from=${encodeURIComponent(mondayISO)}&to=${encodeURIComponent(sundayISO)}&limit=100`,
      ),
  });
}

/** Optimistically flips an assignment's status in the week cache; returns the previous snapshot for rollback. */
function setAssignmentStatusOptimistic(
  queryClient: ReturnType<typeof useQueryClient>,
  mondayISO: string,
  assignmentId: string,
  status: AssignmentStatus,
): AssignmentsListResponse | undefined {
  const previous = queryClient.getQueryData<AssignmentsListResponse>(weekQueryKey(mondayISO));
  queryClient.setQueryData<AssignmentsListResponse>(weekQueryKey(mondayISO), (current) =>
    current
      ? { assignments: current.assignments.map((a) => (a.id === assignmentId ? { ...a, status } : a)) }
      : current,
  );
  return previous;
}

/** All mutations invalidate the same week's query — the week view is the only reader. */
export function useWeekAssignmentMutations(mondayISO: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: weekQueryKey(mondayISO) });

  const complete = useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.assignmentComplete,
    retry: offlineMutationRetry,
    mutationFn: (assignmentId: string) => apiFetch(`/api/assignments/${assignmentId}/complete`, { method: "POST", body: {} }),
    onMutate: async (assignmentId) => {
      await queryClient.cancelQueries({ queryKey: weekQueryKey(mondayISO) });
      return { previous: setAssignmentStatusOptimistic(queryClient, mondayISO, assignmentId, "COMPLETED") };
    },
    onError: (error, _assignmentId, context) => {
      if (context?.previous) queryClient.setQueryData(weekQueryKey(mondayISO), context.previous);
    },
    onSettled: invalidate,
  });

  const uncomplete = useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.assignmentUncomplete,
    retry: offlineMutationRetry,
    mutationFn: (assignmentId: string) => apiFetch(`/api/assignments/${assignmentId}/uncomplete`, { method: "POST", body: {} }),
    onMutate: async (assignmentId) => {
      await queryClient.cancelQueries({ queryKey: weekQueryKey(mondayISO) });
      return { previous: setAssignmentStatusOptimistic(queryClient, mondayISO, assignmentId, "PENDING") };
    },
    onError: (error, _assignmentId, context) => {
      if (context?.previous) queryClient.setQueryData(weekQueryKey(mondayISO), context.previous);
    },
    onSettled: invalidate,
  });

  const patch = useMutation({
    mutationFn: ({ assignmentId, body }: { assignmentId: string; body: AssignmentPatch }) =>
      apiFetch(`/api/assignments/${assignmentId}`, { method: "PATCH", body }),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (assignmentId: string) => apiFetch(`/api/assignments/${assignmentId}`, { method: "DELETE" }),
    onSettled: invalidate,
  });

  return { complete, uncomplete, patch, remove };
}
