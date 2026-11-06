"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { Toggle } from "@/components/ds/toggle";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { useRotationMutations, useRotationsList } from "@/hooks/use-rotations";
import { useTareasTasks } from "@/hooks/use-tareas-tasks";
import { buildRotationPatternText } from "@/lib/tareas-rotation";
import { SorteoSheet } from "./sorteo-sheet";

interface RotacionesViewProps {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentMemberId: string;
  initialSorteoOpen: boolean;
}

/** Rotaciones view — toggle active rotations, sortear a task (handoff §5.2 `/tareas/rotaciones`). */
export function RotacionesView({ members, currentMemberId, initialSorteoOpen }: RotacionesViewProps): React.JSX.Element {
  const { data, isLoading } = useRotationsList();
  const { data: tasksData } = useTareasTasks();
  const mutations = useRotationMutations();
  const [sorteoOpen, setSorteoOpen] = useState(initialSorteoOpen);

  const rotations = data?.rotations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setSorteoOpen(true)}
        className="flex items-center gap-3 rounded-[16px] bg-manteca-soft px-4 py-3.5 text-left"
      >
        <Dices className="size-5 text-ink" strokeWidth={1.75} />
        <span className="text-[15px] font-medium text-ink">Sortear una tarea</span>
      </button>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
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
