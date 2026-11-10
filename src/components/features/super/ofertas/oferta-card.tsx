"use client";

import { Check, Package, Plus } from "lucide-react";
import { StoreChip } from "@/components/ds/store-chip";

import type { TopDealProduct } from "@habita/contracts";

interface OfertaCardProps {
  deal: TopDealProduct;
  inList: boolean;
  onAdd: () => void;
}

/**
 * NOTE: `TopDealProduct` (packages/contracts/src/grocery-deals.ts) has no
 * `imageUrl` field, so the handoff's 96px product photo is a placeholder
 * icon box instead — flagged in the delivery report, contract unchanged.
 */
export function OfertaCard({ deal, inList, onAdd }: OfertaCardProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded-[16px] bg-paper p-3">
      <div className="flex h-24 w-full items-center justify-center rounded-[12px] bg-sand">
        <Package className="size-8 text-ink-3" strokeWidth={1.75} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <StoreChip store={deal.store} />
        {deal.savingsPercent != null && deal.savingsPercent > 0 && (
          <span className="rounded-full bg-manteca-soft px-2 py-0.5 text-[11px] font-semibold text-manteca-text">
            -{deal.savingsPercent.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-[14px] font-medium text-ink">{deal.productName}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[16px] font-bold text-ink">{deal.price}</span>
        <button
          type="button"
          onClick={onAdd}
          disabled={inList}
          aria-label={inList ? "En tu lista" : `Agregar ${deal.productName} a la lista`}
          className="flex h-9 items-center gap-1 rounded-full bg-monte px-3 text-[13px] font-semibold text-paper transition-opacity disabled:bg-monte-soft disabled:text-monte"
        >
          {inList ? <Check className="size-3.5" strokeWidth={2} /> : <Plus className="size-3.5" strokeWidth={2} />}
          {inList ? "En tu lista" : null}
        </button>
      </div>
    </div>
  );
}
