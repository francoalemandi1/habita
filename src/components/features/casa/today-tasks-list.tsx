"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ds/checkbox";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
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
      try {
        await apiFetch(`/api/assignments/${task.id}/${action}`, { method: "POST", body: action === "complete" ? {} : undefined });
        if (action === "complete") {
          show({
            text: `«${task.name}» · hecha`,
            actionKind: "undo",
            onAction: () => runRef.current(task, "uncomplete", previousStatus),
          });
        }
        router.refresh();
      } catch {
        setStatus(task.id, previousStatus);
        show({
          text: "No se pudo guardar",
          actionKind: "retry",
          onAction: () => runRef.current(task, action, previousStatus),
        });
      }
    },
    [router, setStatus, show],
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
          <span className="flex-1 text-[16px] font-medium text-ink">{task.name}</span>
          {task.meta && <span className="shrink-0 text-[13px] text-ink-2">{task.meta}</span>}
        </div>
      ))}
    </div>
  );
}
