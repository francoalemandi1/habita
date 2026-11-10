"use client";

import { Minus, Plus, X } from "lucide-react";

import type { ItemDraft } from "./anotar-draft-types";

interface AnotarItemPreviewProps {
  drafts: ItemDraft[];
  onChange: (next: ItemDraft[]) => void;
}

function updateQuantity(drafts: ItemDraft[], index: number, delta: number): ItemDraft[] {
  return drafts.map((item, itemIndex) =>
    itemIndex === index ? { ...item, quantity: Math.min(99, Math.max(1, item.quantity + delta)) } : item,
  );
}

export function AnotarItemPreview({ drafts, onChange }: AnotarItemPreviewProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-sand p-4">
      <span className="inline-flex h-[24px] w-fit items-center rounded-full bg-monte-soft px-2.5 text-[12px] font-semibold text-monte">
        Compra
      </span>

      <div className="flex flex-col gap-2">
        {drafts.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center gap-2 rounded-[12px] bg-paper px-3 py-2">
            <input
              value={item.name}
              onChange={(event) =>
                onChange(drafts.map((draft, draftIndex) => (draftIndex === index ? { ...draft, name: event.target.value } : draft)))
              }
              className="h-7 flex-1 bg-transparent text-[15px] text-ink outline-none"
            />
            <button type="button" onClick={() => onChange(updateQuantity(drafts, index, -1))} aria-label="Restar" className="text-ink-2">
              <Minus className="size-4" strokeWidth={1.75} />
            </button>
            <span className="w-6 text-center text-[14px] text-ink">{item.quantity}</span>
            <button type="button" onClick={() => onChange(updateQuantity(drafts, index, 1))} aria-label="Sumar" className="text-ink-2">
              <Plus className="size-4" strokeWidth={1.75} />
            </button>
            {drafts.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(drafts.filter((_, draftIndex) => draftIndex !== index))}
                aria-label="Quitar"
                className="text-ink-3"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
