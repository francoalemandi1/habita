"use client";

import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ds/checkbox";
import { PendingDot } from "@/components/ds/pending-dot";
import { cn } from "@/lib/utils";
import { ListaQuantity } from "./lista-quantity";

import type { ShoppingListItem } from "@habita/contracts";

interface ListaRowProps {
  item: ShoppingListItem;
  currentMemberId: string;
  isOffer: boolean;
  isSyncPending: boolean;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onDelete: () => void;
}

/** One row of the shared shopping list. The view-transition name lets the row glide into "En el carrito". */
export function ListaRow({ item, currentMemberId, isOffer, isSyncPending, onToggle, onQuantityChange, onDelete }: ListaRowProps): React.JSX.Element {
  const isChecked = item.checkedAt !== null;

  return (
    <div
      className="group flex min-h-[52px] items-center gap-1.5 border-b border-line-soft py-1 last:border-b-0"
      style={{ viewTransitionName: `lista-item-${item.id}` }}
    >
      <Checkbox state={isChecked ? "done" : "pending"} label={item.name} onToggle={onToggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("truncate text-[15px] font-medium text-ink", isChecked && "text-ink-2 line-through decoration-ink-3")}>
            {item.name}
          </span>
          {isSyncPending && <PendingDot />}
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
      <ListaQuantity itemName={item.name} quantity={item.quantity} isChecked={isChecked} onChange={onQuantityChange} />
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Eliminar ${item.name}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-ink-2 outline-none transition-colors hover:bg-ladrillo-soft hover:text-ladrillo-text focus-visible:ring-2 focus-visible:ring-monte"
      >
        <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
