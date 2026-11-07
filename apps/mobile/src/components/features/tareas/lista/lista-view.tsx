import { useMemo, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Pencil, Repeat, Trash2 } from "lucide-react-native";
import { Banner, Button, ContextMenu, EmptyState, ListRow, Skeleton, useSnackbar } from "@/components/ds";
import { useDeleteTask, useTasks } from "@/hooks/use-task-management";
import { useCreateRotation, useDeleteRotation, useRotations } from "@/hooks/use-rotations";
import { useThemeColors } from "@/hooks/use-theme";
import { cancelDelete, scheduleDelete } from "@/lib/deferred-delete";
import { fontFamilyForWeight, spacing } from "@/theme";
import { EditTaskSheet } from "./edit-task-sheet";

import type { ThemeColors } from "@/theme";
import type { TaskSummary } from "@habita/contracts";

const DEFERRED_DELETE_MS = 5000;

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

/** Tareas "Lista" (handoff §5.3): household tasks with frequency + rotation badge, edit/delete. */
export function ListaView(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tasksQuery = useTasks();
  const rotationsQuery = useRotations();
  const deleteTask = useDeleteTask();
  const createRotation = useCreateRotation();
  const deleteRotation = useDeleteRotation();
  const snackbar = useSnackbar();
  const [editTarget, setEditTarget] = useState<TaskSummary | null>(null);

  const rotatingTaskIds = useMemo(
    () => new Set((rotationsQuery.data?.rotations ?? []).filter((r) => r.isActive).map((r) => r.taskId)),
    [rotationsQuery.data],
  );
  const tasks = tasksQuery.data?.tasks.filter((t) => t.isActive !== false) ?? [];

  function handleDelete(task: TaskSummary): void {
    scheduleDelete({
      id: task.id,
      delayMs: DEFERRED_DELETE_MS,
      run: () => {
        deleteTask.mutateAsync(task.id).catch(() =>
          snackbar.show({ text: "No se pudo eliminar", tone: "error", actionLabel: "Reintentar", onAction: () => handleDelete(task) }),
        );
      },
    });
    snackbar.show({ text: "Tarea eliminada", actionLabel: "Deshacer", onAction: () => cancelDelete(task.id) });
  }

  function handleToggleRotation(task: TaskSummary): void {
    if (rotatingTaskIds.has(task.id)) {
      deleteRotation.mutate(task.id);
    } else {
      createRotation.mutate(task.id);
    }
  }

  if (tasksQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </View>
    );
  }

  if (tasksQuery.isError) {
    return (
      <View style={styles.container}>
        <Banner tone="attention" text="No pudimos cargar las tareas." />
        <Button label="Reintentar" variant="link" onPress={() => void tasksQuery.refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {tasks.length === 0 ? (
        <EmptyState title="Sin tareas todavía" description="Sumá tareas del catálogo o creá una propia." />
      ) : (
        tasks.map((task) => {
          const isRotating = rotatingTaskIds.has(task.id);
          const meta = `${FREQUENCY_LABELS[task.frequency] ?? task.frequency}${isRotating ? " · Rotación" : ""}`;
          return (
            <ContextMenu
              key={task.id}
              items={[
                { key: "edit", label: "Editar", icon: Pencil, onPress: () => setEditTarget(task) },
                {
                  key: "rotation",
                  label: isRotating ? "Quitar rotación" : "Hacer rotación",
                  icon: Repeat,
                  onPress: () => handleToggleRotation(task),
                },
                { key: "delete", label: "Eliminar", icon: Trash2, onPress: () => handleDelete(task), destructive: true },
              ]}
            >
              <ListRow title={task.name} meta={meta} onPress={() => setEditTarget(task)} />
            </ContextMenu>
          );
        })
      )}

      <View style={styles.footer}>
        <Text style={styles.footerHint}>¿Falta algo?</Text>
        <Button label="Sumar tareas" variant="secondary" onPress={() => router.push("/(app)/tareas/sumar")} />
        <Button label="Rotaciones" variant="link" onPress={() => router.push("/(app)/tareas/rotaciones")} />
      </View>

      {editTarget ? <EditTaskSheet visible task={editTarget} onClose={() => setEditTarget(null)} /> : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing.xl,
    },
    footer: {
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    footerHint: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
  });
}
