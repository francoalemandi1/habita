import { useMemo, useState, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState, useSnackbar } from "@/components/ds";
import { useMembers } from "@/hooks/use-members";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { useWeekAssignments } from "@/hooks/use-week-assignments";
import { useDeleteAssignment } from "@/hooks/use-assignments";
import { useToggleAssignment } from "@/hooks/use-toggle-assignment";
import { useCreateRotation, useDeleteRotation, useRotations } from "@/hooks/use-rotations";
import { useTransfers } from "@/hooks/use-transfers";
import { cancelDelete, getDeferredDeleteVersion, isPendingDelete, scheduleDelete, subscribeDeferredDeletes } from "@/lib/deferred-delete";
import { formatDayGroupLabel, groupByDueDate } from "@/lib/tareas-day-groups";
import { toTaskFrequency } from "@/lib/tareas-task-frequency";
import { dayKey } from "@/lib/tareas-week-strip";
import { fontFamilyForWeight, spacing } from "@/theme";
import { AssignmentRow } from "./assignment-row";
import { TransferSheet } from "./transfer-sheet";
import { ChangeDaySheet } from "./change-day-sheet";
import { EditTaskSheet } from "../lista/edit-task-sheet";
import { WeekStrip } from "./week-strip";

import type { ThemeColors } from "@/theme";
import type { AssignmentSummary, TaskSummary } from "@habita/contracts";

const DEFERRED_DELETE_MS = 5000;

function toTaskSummaryStub(assignment: AssignmentSummary): TaskSummary {
  return {
    id: assignment.task.id,
    householdId: assignment.householdId,
    name: assignment.task.name,
    frequency: toTaskFrequency(assignment.task.frequency),
    weight: assignment.task.weight,
    estimatedMinutes: assignment.task.estimatedMinutes ?? null,
  };
}

/** Tareas "Semana" (handoff §5.3): day-grouped assignments with swipe + context-menu actions. */
export function SemanaView(): React.JSX.Element {
  const { me, activeHouseholdId } = useMobileAuth();
  const membersQuery = useMembers();
  const weekQuery = useWeekAssignments(new Date());
  const rotationsQuery = useRotations();
  const transfersQuery = useTransfers("sent");
  const snackbar = useSnackbar();
  const toggle = useToggleAssignment();
  const deleteAssignment = useDeleteAssignment();
  const createRotation = useCreateRotation();
  const deleteRotation = useDeleteRotation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [transferTarget, setTransferTarget] = useState<AssignmentSummary | null>(null);
  const [changeDayTarget, setChangeDayTarget] = useState<AssignmentSummary | null>(null);
  const [editTarget, setEditTarget] = useState<AssignmentSummary | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey(new Date()));

  const currentMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? "";
  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const rotatingTaskIds = useMemo(
    () => new Set((rotationsQuery.data?.rotations ?? []).filter((r) => r.isActive).map((r) => r.taskId)),
    [rotationsQuery.data],
  );
  const pendingTransferByAssignmentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const transfer of transfersQuery.data?.transfers ?? []) {
      if (transfer.status === "PENDING") map.set(transfer.assignmentId, transfer.toMember.name);
    }
    return map;
  }, [transfersQuery.data]);

  // `pendingVersion` isn't read directly, but subscribing to it forces this
  // component to re-render whenever a deferred delete starts or is flushed,
  // which is all this filter needs — no memoization required.
  useSyncExternalStore(subscribeDeferredDeletes, getDeferredDeleteVersion);
  const assignments = weekQuery.data ?? [];
  const visible = assignments.filter((a) => !isPendingDelete(a.id));
  const dueDateKeys = useMemo(() => visible.map((a) => dayKey(new Date(a.dueDate))), [visible]);
  const groups = useMemo(() => groupByDueDate(visible), [visible]);
  const activeGroup = groups.find((g) => g.key === selectedDayKey) ?? groups[0] ?? null;

  function handleDelete(assignment: AssignmentSummary): void {
    scheduleDelete({
      id: assignment.id,
      delayMs: DEFERRED_DELETE_MS,
      run: () => {
        deleteAssignment.mutateAsync(assignment.id).catch(() =>
          snackbar.show({ text: "No se pudo eliminar", tone: "error", actionLabel: "Reintentar", onAction: () => handleDelete(assignment) }),
        );
      },
    });
    snackbar.show({ text: "Tarea eliminada", actionLabel: "Deshacer", onAction: () => cancelDelete(assignment.id) });
  }

  function handleToggleRotation(assignment: AssignmentSummary): void {
    const taskId = assignment.task.id;
    if (rotatingTaskIds.has(taskId)) {
      deleteRotation.mutate(taskId, { onError: () => snackbar.show({ text: "No se pudo guardar", tone: "error" }) });
    } else {
      createRotation.mutate(taskId, { onError: () => snackbar.show({ text: "No se pudo guardar", tone: "error" }) });
    }
  }

  if (weekQuery.isLoading) return <View style={styles.container} />;

  if (visible.length === 0) {
    return <EmptyState title="Sin tareas esta semana" description="Sumá tareas o generá un plan para empezar." />;
  }

  return (
    <View style={styles.container}>
      <WeekStrip now={new Date()} assignmentDueDateKeys={dueDateKeys} selectedKey={selectedDayKey} onSelect={setSelectedDayKey} />
      {activeGroup ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{formatDayGroupLabel(activeGroup.date, activeGroup.key === dayKey(new Date()))}</Text>
          {activeGroup.items.map((assignment) => {
            const assignee = memberById.get(assignment.memberId);
            return (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                assigneeName={assignee?.name ?? "?"}
                isAssigneeCurrentUser={assignment.memberId === currentMemberId}
                requiresVerification={assignee?.memberType === "TEEN" || assignee?.memberType === "CHILD"}
                isRotating={rotatingTaskIds.has(assignment.task.id)}
                pendingTransferToName={pendingTransferByAssignmentId.get(assignment.id) ?? null}
                onToggle={() =>
                  toggle.complete(assignment, assignment.task.name, {
                    isOwn: assignment.memberId === currentMemberId,
                    assigneeName: assignee?.name,
                    requiresVerification: assignee?.memberType === "TEEN" || assignee?.memberType === "CHILD",
                  })
                }
                onEdit={() => setEditTarget(assignment)}
                onChangeDay={() => setChangeDayTarget(assignment)}
                onPass={() => setTransferTarget(assignment)}
                onToggleRotation={() => handleToggleRotation(assignment)}
                onDelete={() => handleDelete(assignment)}
              />
            );
          })}
        </View>
      ) : null}

      {transferTarget ? (
        <TransferSheet
          visible
          assignment={transferTarget}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
          dayAssignments={visible}
          onClose={() => setTransferTarget(null)}
        />
      ) : null}
      {changeDayTarget ? (
        <ChangeDaySheet visible assignment={changeDayTarget} onClose={() => setChangeDayTarget(null)} />
      ) : null}
      {editTarget ? (
        <EditTaskSheet visible task={toTaskSummaryStub(editTarget)} onClose={() => setEditTarget(null)} />
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing.xl,
    },
    group: {
      marginTop: spacing.sm,
    },
    groupLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 11,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      color: c.ink3,
      paddingBottom: spacing.xs,
    },
  });
}
