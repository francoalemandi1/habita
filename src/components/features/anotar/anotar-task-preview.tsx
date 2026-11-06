"use client";

import { useState } from "react";
import { taskFrequencySchema } from "@habita/contracts";
import { RadioGroup } from "@/components/ds/radio";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { TASK_FREQUENCIES } from "@/lib/tareas-frequency";
import { cn } from "@/lib/utils";

import type { MemberSummary } from "@habita/contracts";
import type { TaskDraft } from "./anotar-draft-types";

type OpenField = "assignee" | "date" | "frequency" | null;

interface AnotarTaskPreviewProps {
  draft: TaskDraft;
  onChange: (next: TaskDraft) => void;
  members: MemberSummary[];
}

const UNASSIGNED = "__unassigned__";

export function AnotarTaskPreview({ draft, onChange, members }: AnotarTaskPreviewProps): React.JSX.Element {
  const [openField, setOpenField] = useState<OpenField>(null);

  const assigneeName = draft.assigneeId
    ? members.find((member) => member.id === draft.assigneeId)?.name ?? "Que lo decida el reparto"
    : "Que lo decida el reparto";

  function toggleField(field: Exclude<OpenField, null>): void {
    setOpenField((current) => (current === field ? null : field));
  }

  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-sand p-4">
      <span className="inline-flex h-[24px] w-fit items-center rounded-full bg-monte-soft px-2.5 text-[12px] font-semibold text-monte">
        Tarea
      </span>

      <input
        value={draft.name}
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
        placeholder="¿Qué hay que hacer?"
        className="h-9 w-full bg-transparent text-[17px] font-semibold text-ink outline-none"
      />

      <div className="flex flex-wrap gap-1.5">
        <ChipButton label={assigneeName} active={openField === "assignee"} onClick={() => toggleField("assignee")} />
        <ChipButton label={draft.dueDate ?? "Sin fecha"} active={openField === "date"} onClick={() => toggleField("date")} />
        <ChipButton label={FREQUENCY_LABELS[draft.frequency]} active={openField === "frequency"} onClick={() => toggleField("frequency")} />
      </div>

      {openField === "assignee" && (
        <RadioGroup
          name="anotar-task-assignee"
          value={draft.assigneeId ?? UNASSIGNED}
          onChange={(value) => {
            onChange({ ...draft, assigneeId: value === UNASSIGNED ? null : value });
            setOpenField(null);
          }}
          options={[
            { value: UNASSIGNED, label: "Que lo decida el reparto" },
            ...members.map((member) => ({ value: member.id, label: member.name })),
          ]}
          className="rounded-[12px] bg-paper p-2"
        />
      )}

      {openField === "date" && (
        <input
          type="date"
          value={draft.dueDate ?? ""}
          onChange={(event) => {
            onChange({ ...draft, dueDate: event.target.value || null });
            setOpenField(null);
          }}
          className="h-9 rounded-[12px] border border-line bg-paper px-3 text-[14px] text-ink"
        />
      )}

      {openField === "frequency" && (
        <RadioGroup
          name="anotar-task-frequency"
          value={draft.frequency}
          onChange={(value) => {
            const parsed = taskFrequencySchema.safeParse(value);
            if (!parsed.success) {
              console.warn("AnotarTaskPreview: invalid frequency", parsed.error);
              return;
            }
            onChange({ ...draft, frequency: parsed.data });
            setOpenField(null);
          }}
          options={TASK_FREQUENCIES.map((frequency) => ({ value: frequency, label: FREQUENCY_LABELS[frequency] }))}
          className="rounded-[12px] bg-paper p-2"
        />
      )}
    </div>
  );
}

function ChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("inline-flex h-[30px] items-center rounded-full px-3 text-[13px] font-medium", active ? "bg-ink text-paper" : "bg-paper text-ink-2")}
    >
      {label}
    </button>
  );
}
