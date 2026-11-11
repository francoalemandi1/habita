import { ExternalLink } from "lucide-react";

import type { CompareAlternative as AlternativeProduct } from "@habita/prices";
import { ProductThumbnail } from "./product-thumbnail";
import { formatPrice } from "./helpers";

interface AlternativesSectionProps {
  alternatives: AlternativeProduct[];
  onSwap?: (alternative: AlternativeProduct) => void;
}

/** List of other matches for a product, shown once the row's "Cambiar" is open. */
export function AlternativesSection({ alternatives, onSwap }: AlternativesSectionProps): React.JSX.Element | null {
  if (alternatives.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1 rounded-[14px] bg-sand p-2">
      <p className="px-1 pb-1 text-[12px] font-medium text-ink-2">Otras opciones</p>
      {alternatives.map((alt) => (
        <div key={alt.link} className="flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-[13px]">
          <ProductThumbnail imageUrl={alt.imageUrl} size="sm" />
          <span className="line-clamp-2 min-w-0 flex-1 text-ink-2">{alt.productName}</span>
          <div className="ml-2 flex shrink-0 items-center gap-2">
            <span className="font-medium text-ink">{formatPrice(alt.price)}</span>
            {onSwap && (
              <button
                type="button"
                onClick={() => onSwap(alt)}
                className="min-h-9 rounded-full bg-monte-soft px-2 py-1 text-[11px] font-medium text-monte transition-colors hover:bg-monte-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
              >
                Elegir
              </button>
            )}
            <a
              href={alt.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver ${alt.productName} en el super`}
              className="rounded-[12px] p-1 text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
            >
              <ExternalLink className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
