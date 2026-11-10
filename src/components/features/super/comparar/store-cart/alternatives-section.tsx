"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompareAlternative as AlternativeProduct } from "@habita/prices";
import { ProductThumbnail } from "./product-thumbnail";
import { formatPrice } from "./helpers";

interface AlternativesSectionProps {
  alternatives: AlternativeProduct[];
  onSwap?: (alternative: AlternativeProduct) => void;
}

export function AlternativesSection({ alternatives, onSwap }: AlternativesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (alternatives.length === 0) return null;

  return (
    <div className="px-4 pb-1.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
          "bg-sand text-ink-2 transition-colors",
          "hover:bg-sand hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte",
          isOpen && "bg-monte-soft text-monte",
        )}
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />
        {alternatives.length} alternativa{alternatives.length !== 1 ? "s" : ""}
      </button>

      {isOpen && (
        <div className="mt-1.5 space-y-0.5 rounded-[14px] bg-paper p-2">
          {alternatives.map((alt) => (
            <div
              key={alt.link}
              className={cn(
                "flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-xs transition-colors",
                onSwap ? "cursor-pointer hover:bg-monte-soft" : "hover:bg-sand",
              )}
              onClick={onSwap ? () => onSwap(alt) : undefined}
            >
              <ProductThumbnail imageUrl={alt.imageUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate text-ink-2">
                {alt.productName}
              </span>
              <div className="ml-2 flex shrink-0 items-center gap-2">
                <span className="font-medium text-ink">{formatPrice(alt.price)}</span>
                {onSwap && (
                  <span className="rounded-full bg-monte-soft px-1.5 py-0.5 text-[10px] font-medium text-monte">
                    Elegir
                  </span>
                )}
                <a
                  href={alt.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ver ${alt.productName} en el super`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-[12px] p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
                >
                  <ExternalLink className="h-2.5 w-2.5 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
