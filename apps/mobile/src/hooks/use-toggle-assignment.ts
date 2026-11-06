import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useCompleteAssignment, useUncompleteAssignment } from "./use-assignments";
import { useSnackbar } from "@/components/ds";

import { queryKeys } from "@habita/contracts";
import type { AssignmentSummary, MyAssignmentsResponse } from "@habita/contracts";

interface CompleteOptions {
  /** The assignee's first name, required when completing someone else's task. */
  assigneeName?: string;
  /** False when completing someone else's task (handoff §7: allowed, different snackbar copy). */
  isOwn?: boolean;
  /** TEEN/CHILD completions wait for an adult's verification before they count as done. */
  requiresVerification?: boolean;
}

function resolveCompleteSnackbarText(taskName: string, options: CompleteOptions): string {
  if (options.isOwn === false) return `La hiciste por ${options.assigneeName ?? "otra persona"}`;
  if (options.requiresVerification) return `«${taskName}» · para revisar`;
  return `«${taskName}» · hecha`;
}

function moveAssignment(
  data: MyAssignmentsResponse,
  assignmentId: string,
  toCompleted: boolean,
): MyAssignmentsResponse {
  const assignments = data.assignments.map((assignment) =>
    assignment.id === assignmentId
      ? { ...assignment, status: toCompleted ? ("COMPLETED" as const) : ("PENDING" as const) }
      : assignment,
  );
  const pending = assignments.filter((a) => a.status !== "COMPLETED" && a.status !== "VERIFIED");
  const completed = assignments.filter((a) => a.status === "COMPLETED" || a.status === "VERIFIED");
  return {
    assignments,
    pending,
    completed,
    stats: { total: assignments.length, pendingCount: pending.length, completedCount: completed.length },
  };
}

/**
 * Pattern A wrapper (§7) over complete/uncomplete: optimistic cache update,
 * rollback on error, haptic on check and the "hecha · Deshacer" snackbar.
 */
export function useToggleAssignment() {
  const queryClient = useQueryClient();
  const completeAssignment = useCompleteAssignment();
  const uncompleteAssignment = useUncompleteAssignment();
  const snackbar = useSnackbar();

  const setOptimistic = useCallback(
    (assignmentId: string, toCompleted: boolean) => {
      const key = queryKeys.assignments.my();
      // Stop in-flight refetches from overwriting the optimistic state.
      void queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MyAssignmentsResponse>(key);
      if (previous) {
        queryClient.setQueryData<MyAssignmentsResponse>(key, moveAssignment(previous, assignmentId, toCompleted));
      }
      return previous;
    },
    [queryClient],
  );

  // The week board (done count, SplitBar) lives under its own key; the base
  // mutations only invalidate "my" assignments.
  const refreshWeek = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all() });
  }, [queryClient]);

  const rollback = useCallback(
    (previous: MyAssignmentsResponse | undefined) => {
      if (previous) queryClient.setQueryData(queryKeys.assignments.my(), previous);
    },
    [queryClient],
  );

  // A named function declaration (hoisted), not a `const`, so the retry
  // action below can call it by name without a useCallback self-reference.
  function attemptComplete(assignment: AssignmentSummary, taskName: string, options: CompleteOptions = {}): void {
    const previous = setOptimistic(assignment.id, true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    completeAssignment.mutate(assignment.id, {
      onSuccess: () => {
        refreshWeek();
        snackbar.show({
          text: resolveCompleteSnackbarText(taskName, options),
          tone: "navigation",
          actionLabel: "Deshacer",
          onAction: () => {
            const beforeUndo = setOptimistic(assignment.id, false);
            uncompleteAssignment.mutate(assignment.id, {
              onSuccess: refreshWeek,
              onError: () => rollback(beforeUndo),
            });
          },
        });
      },
      onError: () => {
        rollback(previous);
        snackbar.show({
          text: "No se pudo guardar",
          tone: "error",
          actionLabel: "Reintentar",
          onAction: () => attemptComplete(assignment, taskName, options),
        });
      },
    });
  }

  const complete = attemptComplete;

  const uncomplete = useCallback(
    (assignment: AssignmentSummary) => {
      const previous = setOptimistic(assignment.id, false);
      uncompleteAssignment.mutate(assignment.id, {
        onSuccess: refreshWeek,
        onError: () => rollback(previous),
      });
    },
    [uncompleteAssignment, setOptimistic, rollback, refreshWeek],
  );

  return { complete, uncomplete };
}
