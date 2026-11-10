"use client";

import { useState } from "react";
import { Button } from "@/components/ds/button";
import { Sheet } from "@/components/ds/sheet";
import { Toggle } from "@/components/ds/toggle";
import { MIN_TASK_NAME_LENGTH, TaskFormFields } from "./task-form-fields";

import type { CreateTaskInput } from "@/hooks/use-tareas-tasks";
import type { TaskFormValues } from "./task-form-fields";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (values: CreateTaskInput) => void;
}

const EMPTY_VALUES: TaskFormValues = { name: "", frequency: "WEEKLY", estimatedMinutes: null };
const DEFAULT_WEIGHT = 2;

/** "Crear tarea" — Lista view's own-task creation form. */
export function CreateTaskDialog({ open, onOpenChange, isSubmitting, onSubmit }: CreateTaskDialogProps): React.JSX.Element {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [isRotating, setIsRotating] = useState(false);
  const canSave = values.name.trim().length >= MIN_TASK_NAME_LENGTH;

  function handleOpenChange(next: boolean): void {
    if (!next) {
      setValues(EMPTY_VALUES);
      setIsRotating(false);
    }
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} title="Crear tarea">
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSubmit({ ...values, name: values.name.trim(), weight: DEFAULT_WEIGHT, isRotating });
        }}
      >
        <TaskFormFields values={values} onChange={setValues} />
        <div className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-[15px] font-medium text-ink">Rotarla entre todos</span>
            <span className="text-[13px] text-ink-2">Cada vez le toca a otra persona.</span>
          </span>
          <Toggle checked={isRotating} onCheckedChange={setIsRotating} label="Rotarla entre todos" />
        </div>
        <Button type="submit" disabled={!canSave} loading={isSubmitting} loadingLabel="Creando">
          Crear tarea
        </Button>
      </form>
    </Sheet>
  );
}
