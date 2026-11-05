"use client";

import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ds/checkbox";
import { Stepper } from "@/components/ds/stepper";
import { cn } from "@/lib/utils";

import type { ShoppingListItem } from "@habita/contracts";

interface ListaRowProps {
  item: ShoppingListItem;
  currentMemberId: string;
  isOffer: boolean;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onDelete: () => void;
}

/** One row of the shared shopping list — pattern A: strike through, stay put until the row moves to the end on the next sort. */
export function ListaRow({ item, currentMemberId, isOffer, onToggle, onQuantityChange, onDelete }: ListaRowProps): React.JSX.Element {
  const isChecked = item.checkedAt !== null;

  return (
    <div className="flex min-h-[60px] items-center gap-2 border-b border-line-soft py-2 last:border-b-0">
      <Checkbox state={isChecked ? "done" : "pending"} onToggle={onToggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("truncate text-[15px] font-medium text-ink", isChecked && "text-ink-3 line-through")}>
            {item.name}
          </span>
          {isOffer && !isChecked && (
            <span className="shrink-0 rounded-full bg-manteca-soft px-1.5 py-0.5 text-[11px] font-semibold text-manteca-text">
              oferta
            </span>
          )}
        </div>
        {item.addedBy.id !== currentMemberId && (
          <span className="truncate text-[13px] text-ink-2">lo agregó {item.addedBy.name}</span>
        )}
      </div>
      <Stepper value={item.quantity} onChange={onQuantityChange} min={1} max={99} className="shrink-0" />
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Eliminar ${item.name}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-ink-3 transition-colors hover:text-ladrillo"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
