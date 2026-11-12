"use client";

import { useState } from "react";
import { ChevronRight, Dices } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { Toggle } from "@/components/ds/toggle";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { useRotationMutations, useRotationsList } from "@/hooks/use-rotations";
import { useTareasTasks } from "@/hooks/use-tareas-tasks";
import { buildRotationPatternText } from "@/lib/tareas-rotation";
import { SorteoSheet } from "./sorteo-sheet";
import { InlineError } from "../inline-error";

interface RotacionesViewProps {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentMemberId: string;
  initialSorteoOpen: boolean;
}

/** Rotaciones view — toggle active rotations, sortear a task (handoff §5.2 `/tareas/rotaciones`). */
export function RotacionesView({ members, currentMemberId, initialSorteoOpen }: RotacionesViewProps): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useRotationsList();
  const { data: tasksData } = useTareasTasks();
  const mutations = useRotationMutations();
  const [sorteoOpen, setSorteoOpen] = useState(initialSorteoOpen);

  const rotations = data?.rotations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setSorteoOpen(true)}
        className="flex min-h-[60px] w-full items-center gap-3 rounded-[16px] bg-surface px-4 py-3 text-left outline-none transition-colors duration-100 hover:bg-paper/60 focus-visible:ring-2 focus-visible:ring-monte"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-manteca-soft">
          <Dices className="size-[18px] text-ink" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-medium text-ink">Sortear una tarea</span>
          <span className="truncate text-[13px] text-ink-2">Elegí una tarea y que la suerte decida quién la hace</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : isError ? (
        <InlineError message="No pudimos cargar las rotaciones." onRetry={() => refetch()} />
      ) : rotations.length === 0 ? (
        <EmptyState
          icon={Dices}
          title="Sin rotaciones"
          description="Activá una rotación desde el menú de una tarea en Semana o Lista."
        />
      ) : (
        <div className="rounded-[16px] bg-surface px-1">
          {rotations.map((rotation) => (
            <ListRow
              key={rotation.id}
              title={rotation.task.name}
              meta={buildRotationPatternText(members, currentMemberId, rotation.frequency)}
              trailing={
                <Toggle
                  checked={rotation.isActive}
                  onCheckedChange={(checked) => mutations.setActive.mutate({ rotationId: rotation.id, isActive: checked })}
                />
              }
            />
          ))}
        </div>
      )}

      <SorteoSheet open={sorteoOpen} onOpenChange={setSorteoOpen} tasks={tasksData?.tasks ?? []} members={members} />
    </div>
  );
}
