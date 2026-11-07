"use client";

import type { ClassicKind } from "./anotar-classic-form";

interface AnotarUnknownCardProps {
  onPickKind: (kind: ClassicKind) => void;
}

/** Shown when the AI couldn't classify the text (handoff §5.3) — hands off to the classic form. */
export function AnotarUnknownCard({ onPickKind }: AnotarUnknownCardProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-sand p-4">
      <p className="text-[15px] text-ink">No entendí qué querés anotar</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => onPickKind("expense")} className="h-9 flex-1 rounded-[12px] bg-paper text-[14px] font-medium text-ink">
          Gasto
        </button>
        <button type="button" onClick={() => onPickKind("task")} className="h-9 flex-1 rounded-[12px] bg-paper text-[14px] font-medium text-ink">
          Tarea
        </button>
        <button type="button" onClick={() => onPickKind("item")} className="h-9 flex-1 rounded-[12px] bg-paper text-[14px] font-medium text-ink">
          Compra
        </button>
      </div>
    </div>
  );
}
