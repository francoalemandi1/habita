"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@habita/contracts";

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

/** All mutations invalidate the same week's query — the week view is the only reader. */
export function useWeekAssignmentMutations(mondayISO: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: weekQueryKey(mondayISO) });

  const complete = useMutation({
    mutationFn: (assignmentId: string) => apiFetch(`/api/assignments/${assignmentId}/complete`, { method: "POST", body: {} }),
    onSettled: invalidate,
  });

  const uncomplete = useMutation({
    mutationFn: (assignmentId: string) => apiFetch(`/api/assignments/${assignmentId}/uncomplete`, { method: "POST", body: {} }),
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
