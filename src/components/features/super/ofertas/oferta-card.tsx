"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Package, Plus } from "lucide-react";
import { StoreChip } from "@/components/ds/store-chip";
import { parseProductUnit } from "@/lib/unit-parser";

import type { TopDealProduct } from "@habita/contracts";

interface OfertaCardProps {
  deal: TopDealProduct;
  inList: boolean;
  onAdd: () => void;
  isAboveFold: boolean;
}

export function OfertaCard({ deal, inList, onAdd, isAboveFold }: OfertaCardProps): React.JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const title = deal.displayName ?? deal.productName;
  const sizeInfo = parseProductUnit(title);
  const imageUrl = imageFailed ? null : (deal.imageUrl ?? null);

  return (
    <div className="flex flex-col gap-2 rounded-[18px] bg-surface p-3">
      <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-[12px] bg-white">
        {imageUrl ? (
          // Remote store CDN images: skip the optimizer so no remotePatterns entry is needed (same as StoreLogo).
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 220px, (min-width: 768px) 30vw, 45vw"
            unoptimized
            loading={isAboveFold ? "eager" : "lazy"}
            className="object-contain p-2"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-sand">
            <Package className="size-6 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <StoreChip store={deal.store} />
        {deal.savingsPercent != null && deal.savingsPercent > 0 && (
          <span className="rounded-full bg-manteca-soft px-2 py-0.5 text-[12px] font-semibold text-manteca-text">
            -{deal.savingsPercent.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-[14px] font-medium text-ink">{title}</p>
      {sizeInfo && <p className="text-[12.5px] text-ink-2">{sizeInfo.unitLabel}</p>}
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[16px] font-bold text-ink">{deal.price}</span>
          {deal.originalPrice && (
            <span className="text-[12px] text-ink-2 line-through">{deal.originalPrice}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={inList}
          aria-label={inList ? `${title} ya está en tu lista` : `Agregar ${title} a la lista`}
          className="group flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-monte"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-monte text-paper group-disabled:bg-monte-soft group-disabled:text-monte">
            {inList ? <Check className="size-3.5" strokeWidth={2} aria-hidden="true" /> : <Plus className="size-3.5" strokeWidth={2} aria-hidden="true" />}
          </span>
        </button>
      </div>
    </div>
  );
}
