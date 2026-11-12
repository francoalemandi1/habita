"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { SwipeRow } from "@/components/ds/swipe-row";
import { buttonVariants } from "@/components/ds/lib/button-variants";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { useSnackbar } from "@/components/ds/snackbar";
import { useTareasTaskMutations, useTareasTasks } from "@/hooks/use-tareas-tasks";
import { useRotationsList } from "@/hooks/use-rotations";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { cancelDelete, isPendingDelete, scheduleDelete, subscribeDeferredDeletes, getDeferredDeletesVersion } from "@/lib/deferred-delete";
import { TAREAS_ROUTES } from "@habita/contracts";
import { CreateTaskDialog } from "./create-task-dialog";
import { EditTaskSheet } from "./edit-task-sheet";
import { InlineError } from "../inline-error";

const DELETE_DELAY_MS = 5_000;

type ListaTask = NonNullable<ReturnType<typeof useTareasTasks>["data"]>["tasks"][number];

function buildListaMeta(task: ListaTask, isRotating: boolean): string {
  const parts = [FREQUENCY_LABELS[task.frequency]];
  if (task.estimatedMinutes) parts.push(`${task.estimatedMinutes} min`);
  if (isRotating) parts.push("Rotación");
  return parts.join(" · ");
}

/** Lista view — household task catalog: frequency, rotation badge, create/edit/delete (handoff §5.3 "Tareas"). */
export function ListaView(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useTareasTasks();
  const { data: rotationsData } = useRotationsList();
  const taskMutations = useTareasTaskMutations();
  const snackbar = useSnackbar();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ListaTask | null>(null);

  const pendingDeleteVersion = useSyncExternalStore(subscribeDeferredDeletes, getDeferredDeletesVersion, () => 0);
  void pendingDeleteVersion;

  const rotatingTaskIds = new Set((rotationsData?.rotations ?? []).filter((r) => r.isActive).map((r) => r.taskId));
  const tasks = (data?.tasks ?? []).filter((task) => !isPendingDelete(task.id));

  function handleDelete(taskId: string, name: string): void {
    scheduleDelete({ id: taskId, run: () => taskMutations.remove.mutate(taskId), delayMs: DELETE_DELAY_MS });
    snackbar.show({ text: `«${name}» eliminada`, actionKind: "undo", onAction: () => cancelDelete(taskId) });
  }

  function renderBody(): React.JSX.Element {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      );
    }
    if (isError) return <InlineError message="No pudimos cargar las tareas." onRetry={() => refetch()} />;
    if (tasks.length === 0) {
      return (
        <EmptyState
          icon={ClipboardList}
          title="Sin tareas todavía"
          description="Sumá tareas del catálogo o creá las tuyas."
          action={
            <Link href={TAREAS_ROUTES.add} className={buttonVariants({ variant: "primary" })}>
              Sumar tareas
            </Link>
          }
        />
      );
    }
    return (
      <div className="rounded-[20px] bg-surface px-2 lg:grid lg:grid-cols-2 lg:gap-x-6">
        {tasks.map((task) => (
          <SwipeRow
            key={task.id}
            title={task.name}
            meta={buildListaMeta(task, rotatingTaskIds.has(task.id))}
            onClick={() => setEditing(task)}
            deleteAction={{ label: `Eliminar ${task.name}`, onAction: () => handleDelete(task.id, task.name) }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-2">
          {tasks.length > 0 ? `${tasks.length} tareas en la casa` : "Las tareas que se reparten en la casa"}
        </p>
        <div className="flex items-center gap-2">
          <Link href={TAREAS_ROUTES.add} className={buttonVariants({ variant: "link", size: "sm" })}>
            Sumar del catálogo
          </Link>
          <button type="button" onClick={() => setCreateOpen(true)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Plus aria-hidden="true" />
            Crear tarea
          </button>
        </div>
      </div>

      {renderBody()}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={taskMutations.create.isPending}
        onSubmit={(values) => taskMutations.create.mutate(values, { onSuccess: () => setCreateOpen(false) })}
      />

      {editing && (
        <EditTaskSheet
          open
          onOpenChange={(open) => !open && setEditing(null)}
          initialValues={{
            name: editing.name,
            frequency: editing.frequency,
            weight: editing.weight,
            estimatedMinutes: editing.estimatedMinutes,
          }}
          isSubmitting={taskMutations.update.isPending}
          onSubmit={(values) => {
            taskMutations.update.mutate({ taskId: editing.id, input: values });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
