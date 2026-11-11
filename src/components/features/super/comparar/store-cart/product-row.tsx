"use client";

import type { AdjustedCartProduct, CompareAlternative as AlternativeProduct } from "@habita/prices";
import { ProductThumbnail } from "./product-thumbnail";
import { AlternativesSection } from "./alternatives-section";
import { ReplaceFlow } from "./replace-flow";
import { formatPrice, formatUnitLabel } from "./helpers";

interface ProductRowProps {
  product: AdjustedCartProduct;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSwap?: (alternative: AlternativeProduct) => void;
  onFindAlternatives?: (query: string) => Promise<AlternativeProduct[]>;
}

/** One product in the store cart detail: name, unit, price and a "Cambiar" that opens alternatives below. */
export function ProductRow({ product, isOpen, onToggleOpen, onSwap, onFindAlternatives }: ProductRowProps): React.JSX.Element {
  return (
    <div className="border-b border-line-soft py-3 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <ProductThumbnail imageUrl={product.imageUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14.5px] text-ink">
            {product.productName}
            {product.isCheapest && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-monte-soft px-1.5 py-0.5 align-middle text-[12px] font-medium text-monte">
                mejor precio
              </span>
            )}
          </p>
          <p className="text-[12px] text-ink-2">
            {product.unitInfo ? formatUnitLabel(product.unitInfo) : product.searchTerm}
            {product.quantity > 1 && ` · ×${product.quantity}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-ink">{formatPrice(product.lineTotal)}</p>
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={isOpen}
            className="mt-0.5 min-h-11 text-[12.5px] font-medium text-ink-2 underline-offset-2 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
          >
            Cambiar
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-1">
          {onFindAlternatives && <ReplaceFlow product={product} onFindAlternatives={onFindAlternatives} onSwap={onSwap} />}
          <AlternativesSection alternatives={product.alternatives} onSwap={onSwap} />
        </div>
      )}
    </div>
  );
}
