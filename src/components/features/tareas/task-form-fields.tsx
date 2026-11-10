"use client";

import { useId } from "react";
import { FilterChip } from "@/components/ds/chip";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { TASK_FREQUENCIES } from "@/lib/tareas-frequency";
import { cn } from "@/lib/utils";

import type { TaskFrequency } from "@prisma/client";

export interface TaskFormValues {
  name: string;
  frequency: TaskFrequency;
  estimatedMinutes: number | null;
}

interface TaskFormFieldsProps {
  values: TaskFormValues;
  onChange: (values: TaskFormValues) => void;
}

const FIELD_LABEL = "text-[13px] font-semibold text-ink-2";
const TEXT_FIELD =
  "h-11 w-full rounded-[12px] border-[1.5px] border-transparent bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-100 placeholder:text-ink-3 focus:border-monte";

export const MIN_TASK_NAME_LENGTH = 2;
// Matches the API bound on Task.estimatedMinutes (8 hours).
const MAX_TASK_MINUTES = 480;

function parseMinutes(text: string): number | null {
  const minutes = Number.parseInt(text, 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.min(minutes, MAX_TASK_MINUTES);
}

/** Name, frequency and duration fields shared by "Crear tarea" and "Editar tarea". */
export function TaskFormFields({ values, onChange }: TaskFormFieldsProps): React.JSX.Element {
  const frequencyLabelId = useId();

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL}>Nombre</span>
        <input
          value={values.name}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
          maxLength={100}
          placeholder="Por ejemplo, regar las plantas"
          autoFocus
          autoComplete="off"
          className={TEXT_FIELD}
        />
      </label>

      <div role="group" aria-labelledby={frequencyLabelId} className="flex flex-col gap-1.5">
        <span id={frequencyLabelId} className={FIELD_LABEL}>Cada cuánto</span>
        <div className="flex flex-wrap gap-1.5">
          {TASK_FREQUENCIES.map((frequency) => (
            <FilterChip key={frequency} active={frequency === values.frequency} onClick={() => onChange({ ...values, frequency })}>
              {FREQUENCY_LABELS[frequency]}
            </FilterChip>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL}>Minutos que lleva, más o menos</span>
        <input
          type="text"
          inputMode="numeric"
          value={values.estimatedMinutes ?? ""}
          onChange={(event) => onChange({ ...values, estimatedMinutes: parseMinutes(event.target.value) })}
          placeholder="Opcional"
          maxLength={3}
          className={cn(TEXT_FIELD, "w-32")}
        />
      </label>
    </>
  );
}
