"use client";

import { useState } from "react";
import { ListRow } from "@/components/ds/list-row";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { useSnackbar } from "@/components/ds/snackbar";
import { useClearTaskPreference, useSetTaskPreference } from "@/hooks/use-preferences";

import type { PreferenceType } from "@/lib/validations/preferences";

export interface TaskPreferenceItem {
  taskId: string;
  taskName: string;
  preference: PreferenceType | null;
}

export interface TaskPreferencesProps {
  tasks: TaskPreferenceItem[];
}

type Answer = "yes" | "no";

/** §5.3 Disponibilidad → preferencias — Sí/No per task (optimistic, pattern A). */
export function TaskPreferences({ tasks: initialTasks }: TaskPreferencesProps): React.JSX.Element {
  const [tasks, setTasks] = useState(initialTasks);
  const setPreference = useSetTaskPreference();
  const clearPreference = useClearTaskPreference();
  const snackbar = useSnackbar();

  function answerFor(preference: PreferenceType | null): Answer | null {
    if (preference === "PREFERRED") return "yes";
    if (preference === "DISLIKED") return "no";
    return null;
  }

  function handleChange(taskId: string, answer: Answer): void {
    const previous = tasks;
    const current = tasks.find((t) => t.taskId === taskId);
    const next = answerFor(current?.preference ?? null) === answer ? null : answer;
    const nextPreference: PreferenceType | null = next === "yes" ? "PREFERRED" : next === "no" ? "DISLIKED" : null;

    setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, preference: nextPreference } : t)));

    const onError = () => {
      setTasks(previous);
      snackbar.show({ text: "No se pudo guardar · Reintentar", tone: "error" });
    };

    if (nextPreference) {
      setPreference.mutate({ taskId, preference: nextPreference }, { onError });
    } else {
      clearPreference.mutate(taskId, { onError });
    }
  }

  return (
    <div className="rounded-[16px] bg-surface px-1">
      {tasks.map((task) => {
        const answer = answerFor(task.preference);
        return (
          <ListRow
            key={task.taskId}
            title={task.taskName}
            trailing={
              // SegmentedControl requires a non-null `value: T`; "" is an unanswered
              // sentinel that matches no option, so neither button renders active.
              <SegmentedControl<Answer | "">
                options={[
                  { value: "yes", label: "Sí" },
                  { value: "no", label: "No" },
                ]}
                value={answer ?? ""}
                onChange={(value) => {
                  if (value === "") return;
                  handleChange(task.taskId, value);
                }}
              />
            }
          />
        );
      })}
    </div>
  );
}
