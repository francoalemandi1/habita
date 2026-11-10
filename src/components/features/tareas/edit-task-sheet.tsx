"use client";

import { useState } from "react";
import { Button } from "@/components/ds/button";
import { Sheet } from "@/components/ds/sheet";
import { MIN_TASK_NAME_LENGTH, TaskFormFields } from "./task-form-fields";

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

/** "Editar" — edits the shared Task definition (every assignment of it), not a single assignment. */
export function EditTaskSheet({ open, onOpenChange, initialValues, isSubmitting, onSubmit }: EditTaskSheetProps): React.JSX.Element {
  const [values, setValues] = useState(initialValues);
  const canSave = values.name.trim().length >= MIN_TASK_NAME_LENGTH;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Editar tarea">
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSubmit({ ...values, name: values.name.trim() });
        }}
      >
        <TaskFormFields values={values} onChange={(next) => setValues({ ...values, ...next })} />
        <p className="text-[13px] text-ink-2">El cambio aplica a todas las veces que se reparte esta tarea.</p>
        <Button type="submit" disabled={!canSave} loading={isSubmitting} loadingLabel="Guardando">
          Guardar
        </Button>
      </form>
    </Sheet>
  );
}
