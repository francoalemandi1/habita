"use client";

import { useState } from "react";
import { Sheet } from "@/components/ds/sheet";
import { Toggle } from "@/components/ds/toggle";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { TASK_FREQUENCIES } from "@/lib/tareas-frequency";

import type { TaskFrequency } from "@prisma/client";
import type { CreateTaskInput } from "@/hooks/use-tareas-tasks";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (values: CreateTaskInput) => void;
}

/** "Crear una tarea propia" — Lista view's own-task creation form. */
export function CreateTaskDialog({ open, onOpenChange, isSubmitting, onSubmit }: CreateTaskDialogProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<TaskFrequency>("WEEKLY");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  function reset(): void {
    setName("");
    setFrequency("WEEKLY");
    setEstimatedMinutes(null);
    setIsRotating(false);
  }

  function handleOpenChange(next: boolean): void {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} title="Crear tarea">
      <div className="flex flex-col gap-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          placeholder="Nombre de la tarea"
          className="h-11 w-full rounded-[12px] border border-line bg-paper px-3 text-[15px] text-ink outline-none"
        />
        <div className="flex gap-2">
          {TASK_FREQUENCIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFrequency(option)}
              className={
                option === frequency
                  ? "rounded-[10px] bg-monte px-3 py-1.5 text-[13px] font-semibold text-paper"
                  : "rounded-[10px] bg-sand px-3 py-1.5 text-[13px] text-ink"
              }
            >
              {FREQUENCY_LABELS[option]}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={480}
          value={estimatedMinutes ?? ""}
          onChange={(event) => setEstimatedMinutes(event.target.value ? Number(event.target.value) : null)}
          placeholder="Minutos estimados (opcional)"
          className="h-11 w-full rounded-[12px] border border-line bg-paper px-3 text-[15px] text-ink outline-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-ink">Rotarla entre todos</span>
          <Toggle checked={isRotating} onCheckedChange={setIsRotating} />
        </div>
        <button
          type="button"
          disabled={name.trim().length < 2 || isSubmitting}
          onClick={() =>
            onSubmit({ name: name.trim(), frequency, weight: 2, estimatedMinutes, isRotating })
          }
          className="h-11 rounded-[12px] bg-monte px-4 text-[15px] font-semibold text-paper disabled:bg-line disabled:text-ink-3"
        >
          Crear tarea
        </button>
      </div>
    </Sheet>
  );
}
