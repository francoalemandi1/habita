"use client";

import { ArrowDownRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdjustedCartProduct, CompareAlternative as AlternativeProduct } from "@habita/prices";
import { ProductThumbnail } from "./product-thumbnail";
import { AlternativesSection } from "./alternatives-section";
import { ReplaceFlow } from "./replace-flow";
import { formatPrice, formatUnitLabel } from "./helpers";

interface ProductRowProps {
  product: AdjustedCartProduct;
  onSwap?: (alternative: AlternativeProduct) => void;
  onFindAlternatives?: (query: string) => Promise<AlternativeProduct[]>;
}

function findCheaperAlternative(product: AdjustedCartProduct): AlternativeProduct | null {
  return product.alternatives.reduce<AlternativeProduct | null>((best, alt) => {
    if (alt.price < product.price && (!best || alt.price < best.price)) return alt;
    return best;
  }, null);
}

export function ProductRow({ product, onSwap, onFindAlternatives }: ProductRowProps) {
  const hasDiscount = Boolean(product.listPrice && product.listPrice > product.price);
  const discountedListTotal = product.listPrice != null ? product.listPrice * product.quantity : null;
  const cheaperAlt = findCheaperAlternative(product);
  const remainingAlternatives = product.alternatives.filter((a) => a.link !== cheaperAlt?.link);

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-sand">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <ProductThumbnail imageUrl={product.imageUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{product.productName}</p>
            {product.unitInfo && (
              <p className="text-[11px] text-ink-2">
                {formatUnitLabel(product.unitInfo)}
              </p>
            )}
          </div>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <div className="text-right">
            {product.quantity > 1 && (
              <div className="text-[10px] text-ink-2">x{product.quantity}</div>
            )}
            <span className={cn("text-sm", product.isCheapest ? "font-bold text-monte" : "font-semibold text-ink")}>
              {formatPrice(product.lineTotal)}
            </span>
            {hasDiscount && discountedListTotal != null && (
              <span className="ml-1 text-xs text-ink-2 line-through">
                {formatPrice(discountedListTotal)}
              </span>
            )}
          </div>
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver ${product.productName} en el super`}
            className="rounded-[12px] p-1 text-ink-2 transition-colors hover:bg-sand hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>
      </div>

      {cheaperAlt && onSwap && (
        <button
          type="button"
          onClick={() => onSwap(cheaperAlt)}
          className="mx-4 mb-1 flex min-h-9 w-[calc(100%-2rem)] items-center gap-1.5 rounded-[14px] bg-monte-soft px-2.5 py-1.5 text-left transition-colors hover:bg-monte-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
        >
          <ArrowDownRight className="h-3 w-3 shrink-0 text-monte" strokeWidth={1.75} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[11px] text-monte">
            {cheaperAlt.productName}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-monte">
            {formatPrice(cheaperAlt.price)}
          </span>
        </button>
      )}

      {onFindAlternatives && (
        <ReplaceFlow product={product} onFindAlternatives={onFindAlternatives} onSwap={onSwap} />
      )}

      {product.alternatives.length > 1 && (
        <AlternativesSection alternatives={remainingAlternatives} onSwap={onSwap} />
      )}
      {product.alternatives.length === 1 && !cheaperAlt && (
        <AlternativesSection alternatives={product.alternatives} onSwap={onSwap} />
      )}
    </div>
  );
}
