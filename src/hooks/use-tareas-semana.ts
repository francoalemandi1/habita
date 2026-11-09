"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { addDays } from "date-fns";
import { useSnackbar } from "@/components/ds/snackbar";
import { useWeekAssignmentMutations, useWeekAssignments } from "@/hooks/use-week-assignments";
import { useRotationMutations, useRotationsList } from "@/hooks/use-rotations";
import { useTareasTaskMutations } from "@/hooks/use-tareas-tasks";
import { useRequestTransfer, useSentTransfers } from "@/hooks/use-tareas-transfers";
import { cancelDelete, isPendingDelete, scheduleDelete, subscribeDeferredDeletes, getDeferredDeletesVersion } from "@/lib/deferred-delete";
import { getWeekDays, getWeekMonday, getWeekSunday, isSameDay } from "@/lib/calendar-utils";
import { buildAssignmentPatch, parseDropTargetId } from "@/lib/tareas-week";
import { dayDropDate } from "@/components/features/tareas/week-day-column";
import { extractStringVariable, usePendingMutationIds } from "@/hooks/use-pending-mutations";

import type { DragEndEvent } from "@dnd-kit/core";
import type { EditTaskValues } from "@/components/features/tareas/edit-task-sheet";
import type { WeekAssignment } from "@/hooks/use-week-assignments";

const DELETE_DELAY_MS = 5_000;

export function useTareasSemana(currentMemberId: string) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [editing, setEditing] = useState<WeekAssignment | null>(null);
  const [changingDay, setChangingDay] = useState<WeekAssignment | null>(null);
  const [pasarTarget, setPasarTarget] = useState<WeekAssignment | null>(null);

  const monday = useMemo(() => addDays(getWeekMonday(new Date()), weekOffset * 7), [weekOffset]);
  const sunday = useMemo(() => getWeekSunday(monday), [monday]);
  const weekDays = useMemo(() => getWeekDays(monday), [monday]);
  const mondayISO = monday.toISOString();
  const sundayISO = sunday.toISOString();

  const { data, isLoading, isError, refetch } = useWeekAssignments(mondayISO, sundayISO);
  const pendingAssignmentIds = usePendingMutationIds(["assignment"], extractStringVariable);
  const { data: transfersData } = useSentTransfers();
  const { data: rotationsData } = useRotationsList();
  const mutations = useWeekAssignmentMutations(mondayISO);
  const rotationMutations = useRotationMutations();
  const taskMutations = useTareasTaskMutations();
  const requestTransfer = useRequestTransfer();
  const snackbar = useSnackbar();

  const pendingDeleteVersion = useSyncExternalStore(subscribeDeferredDeletes, getDeferredDeletesVersion, () => 0);
  void pendingDeleteVersion;

  const assignments = useMemo(
    () => (data?.assignments ?? []).filter((a) => !isPendingDelete(a.id)),
    [data],
  );

  const pendingTransferByAssignment = useMemo(() => {
    const map = new Map<string, string>();
    for (const transfer of transfersData?.transfers ?? []) {
      if (transfer.status === "PENDING") map.set(transfer.assignmentId, transfer.toMember.name);
    }
    return map;
  }, [transfersData]);

  const rotatingTaskIds = useMemo(
    () => new Set((rotationsData?.rotations ?? []).filter((r) => r.isActive).map((r) => r.taskId)),
    [rotationsData],
  );

  const assignmentsByDay = useMemo(
    () => weekDays.map((day) => assignments.filter((a) => isSameDay(new Date(a.dueDate), day))),
    [assignments, weekDays],
  );

  const handleToggleComplete = useCallback(
    (assignment: WeekAssignment) => {
      if (assignment.status !== "PENDING" && assignment.status !== "IN_PROGRESS") return;
      const isOwn = assignment.memberId === currentMemberId;
      mutations.complete.mutate(assignment.id, {
        onSuccess: () => {
          snackbar.show({
            text: isOwn ? `«${assignment.task.name}» · hecha` : `La hiciste por ${assignment.member.name}`,
            actionKind: "undo",
            onAction: () => mutations.uncomplete.mutate(assignment.id),
          });
        },
        onError: () => {
          snackbar.show({ text: "No se pudo completar la tarea", tone: "error" });
        },
      });
    },
    [currentMemberId, mutations, snackbar],
  );

  const handleDelete = useCallback(
    (assignment: WeekAssignment) => {
      scheduleDelete({
        id: assignment.id,
        run: () => mutations.remove.mutate(assignment.id),
        delayMs: DELETE_DELAY_MS,
      });
      snackbar.show({
        text: "Tarea eliminada",
        actionKind: "undo",
        onAction: () => cancelDelete(assignment.id),
      });
    },
    [mutations, snackbar],
  );

  const handleToggleRotation = useCallback(
    (assignment: WeekAssignment) => {
      if (rotatingTaskIds.has(assignment.taskId)) {
        rotationMutations.remove.mutate(assignment.taskId);
      } else {
        rotationMutations.create.mutate(assignment.taskId);
      }
    },
    [rotatingTaskIds, rotationMutations],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const assignmentId = String(event.active.id);
      const overId = event.over?.id ? String(event.over.id) : null;
      if (!overId) return;
      const target = parseDropTargetId(overId);
      if (!target) return;
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      const patch = buildAssignmentPatch(target);
      if (patch.dueDate && isSameDay(new Date(patch.dueDate), new Date(assignment.dueDate))) return;
      if (patch.memberId && patch.memberId === assignment.memberId) return;

      const previous = { dueDate: assignment.dueDate, memberId: assignment.memberId };
      mutations.patch.mutate({ assignmentId, body: patch });
      snackbar.show({
        text: target.kind === "day" ? "Tarea movida de día" : "Tarea reasignada",
        actionKind: "undo",
        onAction: () => mutations.patch.mutate({ assignmentId, body: previous }),
      });
    },
    [assignments, mutations, snackbar],
  );

  const handleEditSubmit = useCallback(
    (values: EditTaskValues) => {
      if (!editing) return;
      taskMutations.update.mutate({ taskId: editing.taskId, input: values });
      setEditing(null);
    },
    [editing, taskMutations],
  );

  const handleChangeDaySubmit = useCallback(
    (day: Date) => {
      if (!changingDay) return;
      mutations.patch.mutate({ assignmentId: changingDay.id, body: { dueDate: dayDropDate(day) } });
      setChangingDay(null);
    },
    [changingDay, mutations],
  );

  const handlePasarSubmit = useCallback(
    (toMemberId: string, reason: string) => {
      if (!pasarTarget) return;
      requestTransfer.mutate(
        { assignmentId: pasarTarget.id, toMemberId, reason: reason.trim() || undefined },
        {
          onSuccess: () => {
            setPasarTarget(null);
            snackbar.show({ text: "Pedido enviado" });
          },
          onError: () => snackbar.show({ text: "No se pudo enviar el pedido", tone: "error" }),
        },
      );
    },
    [pasarTarget, requestTransfer, snackbar],
  );

  return {
    weekOffset,
    setWeekOffset,
    monday,
    weekDays,
    isLoading,
    isError,
    refetch,
    assignments,
    assignmentsByDay,
    pendingAssignmentIds,
    pendingTransferByAssignment,
    rotatingTaskIds,
    editing,
    setEditing,
    changingDay,
    setChangingDay,
    pasarTarget,
    setPasarTarget,
    isApplyingEdit: taskMutations.update.isPending,
    isChangingDay: mutations.patch.isPending,
    isRequestingTransfer: requestTransfer.isPending,
    handleToggleComplete,
    handleDelete,
    handleToggleRotation,
    handleDragEnd,
    handleEditSubmit,
    handleChangeDaySubmit,
    handlePasarSubmit,
  };
}
