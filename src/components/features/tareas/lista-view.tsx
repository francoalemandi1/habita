"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { SwipeRow } from "@/components/ds/swipe-row";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { useSnackbar } from "@/components/ds/snackbar";
import { useTareasTaskMutations, useTareasTasks } from "@/hooks/use-tareas-tasks";
import { useRotationsList } from "@/hooks/use-rotations";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { cancelDelete, isPendingDelete, scheduleDelete, subscribeDeferredDeletes } from "@/lib/deferred-delete";
import { TAREAS_ROUTES } from "@habita/contracts";
import { CreateTaskDialog } from "./create-task-dialog";

const DELETE_DELAY_MS = 5_000;

/** Lista view — household task catalog: frequency, rotation badge, create/delete (handoff §5.3 "Tareas"). */
export function ListaView(): React.JSX.Element {
  const { data, isLoading } = useTareasTasks();
  const { data: rotationsData } = useRotationsList();
  const taskMutations = useTareasTaskMutations();
  const snackbar = useSnackbar();
  const [createOpen, setCreateOpen] = useState(false);

  const pendingDeleteVersion = useSyncExternalStore(subscribeDeferredDeletes, () => 0);
  void pendingDeleteVersion;

  const rotatingTaskIds = new Set((rotationsData?.rotations ?? []).filter((r) => r.isActive).map((r) => r.taskId));
  const tasks = (data?.tasks ?? []).filter((task) => !isPendingDelete(task.id));

  function handleDelete(taskId: string, name: string): void {
    scheduleDelete({ id: taskId, run: () => taskMutations.remove.mutate(taskId), delayMs: DELETE_DELAY_MS });
    snackbar.show({ text: `«${name}» eliminada`, actionKind: "undo", onAction: () => cancelDelete(taskId) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href={TAREAS_ROUTES.add} className="text-[14px] font-medium text-monte">
          Sumar tareas
        </Link>
        <button type="button" onClick={() => setCreateOpen(true)} className="flex items-center gap-1 text-[14px] font-medium text-monte">
          <Plus className="size-4" strokeWidth={1.75} />
          Crear una tarea propia
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin tareas todavía"
          description="Sumá tareas del catálogo o creá las tuyas."
          action={
            <Link href={TAREAS_ROUTES.add} className="text-[15px] font-semibold text-monte">
              Sumar tareas
            </Link>
          }
        />
      ) : (
        <div className="rounded-[16px] bg-surface px-1">
          {tasks.map((task) => (
            <SwipeRow
              key={task.id}
              title={task.name}
              meta={[FREQUENCY_LABELS[task.frequency], rotatingTaskIds.has(task.id) ? "Rotación" : null]
                .filter(Boolean)
                .join(" · ")}
              deleteAction={{ label: "Eliminar", onAction: () => handleDelete(task.id, task.name) }}
            />
          ))}
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={taskMutations.create.isPending}
        onSubmit={(values) => taskMutations.create.mutate(values, { onSuccess: () => setCreateOpen(false) })}
      />
    </div>
  );
}
