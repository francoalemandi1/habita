"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Stepper } from "@/components/ds/stepper";
import { Toggle } from "@/components/ds/toggle";

import type { TaskDraft } from "./anotar-draft-types";

interface AnotarTaskMoreOptionsProps {
  draft: TaskDraft;
  onChange: (next: TaskDraft) => void;
}

/** §5.3 Global "Anotar" — collapsed "Más opciones": descripción, peso, rotación. */
export function AnotarTaskMoreOptions({ draft, onChange }: AnotarTaskMoreOptionsProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="inline-flex items-center gap-1 self-start text-[13px] font-medium text-ink-2"
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        Más opciones
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          <textarea
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value.slice(0, 500) })}
            placeholder="Descripción"
            rows={2}
            maxLength={500}
            className="w-full rounded-[12px] border border-line bg-paper px-3 py-2 text-[14px] text-ink outline-none"
          />

          <div className="flex items-center justify-between rounded-[12px] bg-paper px-3 py-2">
            <span className="text-[14px] text-ink">Peso</span>
            <Stepper value={draft.weight} onChange={(weight) => onChange({ ...draft, weight })} min={1} max={5} />
          </div>

          <div className="flex items-center justify-between rounded-[12px] bg-paper px-3 py-2">
            <span className="text-[14px] text-ink">Rota entre miembros</span>
            <Toggle checked={draft.isRotating} onCheckedChange={(isRotating) => onChange({ ...draft, isRotating })} />
          </div>
        </div>
      )}
    </div>
  );
}
