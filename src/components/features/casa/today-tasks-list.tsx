"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Checkbox } from "@/components/ds/checkbox";
import { PendingDot } from "@/components/ds/pending-dot";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
import { OFFLINE_MUTATION_KEYS } from "@/lib/offline-mutation-keys";
import { offlineMutationRetry } from "@/lib/offline-network";
import { extractStringVariable, usePendingMutationIds } from "@/hooks/use-pending-mutations";
import { checkboxStateForAssignment } from "./casa-logic";

import type { MemberType } from "@prisma/client";
import type { TodayAssignmentStatus } from "./casa-logic";

export interface TodayTaskItem {
  id: string;
  name: string;
  meta: string | null;
  status: TodayAssignmentStatus;
}

interface TodayTasksListProps {
  items: TodayTaskItem[];
  currentMemberType: MemberType;
}

type ToggleAction = "complete" | "uncomplete";

/** Pattern A (handoff §7): optimistic complete/uncomplete with a Deshacer snackbar. */
export function TodayTasksList({ items, currentMemberType }: TodayTasksListProps): React.JSX.Element {
  const [tasks, setTasks] = useState(items);
  const router = useRouter();
  const { show } = useSnackbar();
  const pendingIds = usePendingMutationIds(["assignment"], extractStringVariable);

  const completeMutation = useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.assignmentComplete,
    retry: offlineMutationRetry,
    mutationFn: (assignmentId: string) => apiFetch(`/api/assignments/${assignmentId}/complete`, { method: "POST", body: {} }),
  });
  const uncompleteMutation = useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.assignmentUncomplete,
    retry: offlineMutationRetry,
    mutationFn: (assignmentId: string) => apiFetch(`/api/assignments/${assignmentId}/uncomplete`, { method: "POST", body: {} }),
  });

  const setStatus = useCallback((id: string, status: TodayAssignmentStatus) => {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, status } : task)));
  }, []);

  // Lets the retry/undo snackbar actions call the latest `run` without a
  // self-referencing closure (which the hooks/immutability rule rejects).
  const runRef = useRef<(task: TodayTaskItem, action: ToggleAction, previousStatus: TodayAssignmentStatus) => void>(
    () => undefined,
  );

  const run = useCallback(
    async (task: TodayTaskItem, action: ToggleAction, previousStatus: TodayAssignmentStatus) => {
      setStatus(task.id, action === "complete" ? "COMPLETED" : "PENDING");
      const mutation = action === "complete" ? completeMutation : uncompleteMutation;
      try {
        await mutation.mutateAsync(task.id);
        if (action === "complete") {
          show({
            text: `«${task.name}» · hecha`,
            actionKind: "undo",
            onAction: () => runRef.current(task, "uncomplete", previousStatus),
          });
        }
        router.refresh();
      } catch (error) {
        // Offline, the mutation pauses instead of rejecting (PendingDot shows it queued);
        // reaching here means it really failed, retries included, so roll back.
        console.warn("Could not toggle assignment", error);
        setStatus(task.id, previousStatus);
        show({
          text: "No se pudo guardar",
          actionKind: "retry",
          onAction: () => runRef.current(task, action, previousStatus),
        });
      }
    },
    [completeMutation, router, setStatus, show, uncompleteMutation],
  );
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const toggle = useCallback((task: TodayTaskItem) => {
    const isDone = task.status === "COMPLETED" || task.status === "VERIFIED";
    runRef.current(task, isDone ? "uncomplete" : "complete", task.status);
  }, []);

  if (tasks.length === 0) {
    return <p className="py-3 text-[14px] text-ink-2">No tenés tareas para hoy.</p>;
  }

  return (
    <div className="flex flex-col">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 border-t border-line-soft py-3 first:border-t-0">
          <Checkbox state={checkboxStateForAssignment(task.status, currentMemberType)} onToggle={() => toggle(task)} />
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[16px] font-medium text-ink">
            <span className="truncate">{task.name}</span>
            {pendingIds.has(task.id) && <PendingDot />}
          </span>
          {task.meta && <span className="shrink-0 text-[13px] text-ink-2">{task.meta}</span>}
        </div>
      ))}
    </div>
  );
}
