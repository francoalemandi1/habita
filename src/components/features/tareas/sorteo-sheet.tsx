"use client";

import { useState } from "react";
import { Sheet } from "@/components/ds/sheet";
import { Avatar } from "@/components/ds/avatar";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
import { pickSorteoWinner } from "@/lib/tareas-sorteo";
import { cn } from "@/lib/utils";

interface SorteoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: ReadonlyArray<{ id: string; name: string }>;
  members: ReadonlyArray<{ id: string; name: string }>;
}

/** "Sortear una tarea" — pattern C, no spinning wheel: the winner scales up, the rest fade (handoff §7). */
export function SorteoSheet({ open, onOpenChange, tasks, members }: SorteoSheetProps): React.JSX.Element {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const snackbar = useSnackbar();

  function handleClose(): void {
    setTaskId(null);
    setWinnerId(null);
    onOpenChange(false);
  }

  function handleSortear(): void {
    const winner = pickSorteoWinner(members);
    setWinnerId(winner?.id ?? null);
  }

  async function handleAssign(): Promise<void> {
    if (!taskId || !winnerId) return;
    setIsAssigning(true);
    try {
      await apiFetch("/api/roulette/assign", { method: "POST", body: { memberId: winnerId, taskId } });
      snackbar.show({ text: "Tarea asignada" });
      handleClose();
    } catch (error) {
      console.warn("No se pudo asignar la tarea sorteada", error);
      snackbar.show({ text: "No se pudo asignar la tarea", tone: "error" });
    } finally {
      setIsAssigning(false);
    }
  }

  const winner = members.find((m) => m.id === winnerId);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && handleClose()} title="Sortear una tarea">
      <div className="flex flex-col gap-4">
        {!taskId ? (
          <div className="flex flex-col gap-1">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setTaskId(task.id)}
                className="rounded-[12px] px-3 py-2.5 text-left text-[14px] text-ink hover:bg-sand"
              >
                {task.name}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-6 py-4">
              {members.map((member) => (
                <Avatar
                  key={member.id}
                  name={member.name}
                  size={56}
                  className={cn(
                    "transition-all duration-[600ms]",
                    winnerId && (member.id === winnerId ? "scale-[1.28]" : "opacity-35"),
                  )}
                />
              ))}
            </div>
            {winner && (
              <p className="rounded-[12px] bg-manteca-soft px-3 py-2.5 text-center text-[14px] font-medium text-ink">
                Le toca a {winner.name}
              </p>
            )}
            <div className="flex gap-2">
              {!winnerId ? (
                <button
                  type="button"
                  onClick={handleSortear}
                  className="h-11 flex-1 rounded-[12px] bg-monte text-[15px] font-semibold text-paper"
                >
                  Sortear
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSortear}
                    className="h-11 flex-1 rounded-[12px] bg-sand text-[15px] font-semibold text-ink"
                  >
                    Otra vez
                  </button>
                  <button
                    type="button"
                    disabled={isAssigning}
                    onClick={handleAssign}
                    className="h-11 flex-1 rounded-[12px] bg-monte text-[15px] font-semibold text-paper disabled:bg-line disabled:text-ink-3"
                  >
                    Asignar a {winner?.name}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
