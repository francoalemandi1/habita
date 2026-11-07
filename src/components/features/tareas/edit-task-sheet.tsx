"use client";

import { useState } from "react";
import { Sheet } from "@/components/ds/sheet";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { TASK_FREQUENCIES } from "@/lib/tareas-frequency";

import type { TaskFrequency } from "@prisma/client";

export interface EditTaskValues {
  name: string;
  frequency: TaskFrequency;
  weight: number;
  estimatedMinutes: number | null;
}

interface EditTaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: EditTaskValues;
  isSubmitting: boolean;
  onSubmit: (values: EditTaskValues) => void;
}

/** "Editar" context menu action — edits the shared Task definition, not just this assignment. */
export function EditTaskSheet({ open, onOpenChange, initialValues, isSubmitting, onSubmit }: EditTaskSheetProps): React.JSX.Element {
  const [values, setValues] = useState(initialValues);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Editar tarea">
      <div className="flex flex-col gap-4">
        <input
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          maxLength={100}
          placeholder="Nombre de la tarea"
          className="h-11 w-full rounded-[12px] border border-line bg-paper px-3 text-[15px] text-ink outline-none"
        />
        <div className="flex gap-2">
          {TASK_FREQUENCIES.map((frequency) => (
            <button
              key={frequency}
              type="button"
              onClick={() => setValues({ ...values, frequency })}
              className={
                frequency === values.frequency
                  ? "rounded-[10px] bg-monte px-3 py-1.5 text-[13px] font-semibold text-paper"
                  : "rounded-[10px] bg-sand px-3 py-1.5 text-[13px] text-ink"
              }
            >
              {FREQUENCY_LABELS[frequency]}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={480}
          value={values.estimatedMinutes ?? ""}
          onChange={(event) =>
            setValues({ ...values, estimatedMinutes: event.target.value ? Number(event.target.value) : null })
          }
          placeholder="Minutos estimados"
          className="h-11 w-full rounded-[12px] border border-line bg-paper px-3 text-[15px] text-ink outline-none"
        />
        <button
          type="button"
          disabled={values.name.trim().length < 2 || isSubmitting}
          onClick={() => onSubmit(values)}
          className="h-11 rounded-[12px] bg-monte px-4 text-[15px] font-semibold text-paper disabled:bg-line disabled:text-ink-3"
        >
          Guardar
        </button>
      </div>
    </Sheet>
  );
}
