"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { AdjustedCartProduct, CompareAlternative as AlternativeProduct } from "@habita/prices";
import { buildSuggestedReplaceQuery, formatPrice } from "./helpers";

interface ReplaceFlowProps {
  product: AdjustedCartProduct;
  onFindAlternatives: (query: string) => Promise<AlternativeProduct[]>;
  onSwap?: (alternative: AlternativeProduct) => void;
}

/** Guided "didn't find what you wanted?" search, scoped to this product row. */
export function ReplaceFlow({ product, onFindAlternatives, onSwap }: ReplaceFlowProps) {
  const [replaceQuery, setReplaceQuery] = useState("");
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isHelperVisible, setIsHelperVisible] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const suggestedQuery = buildSuggestedReplaceQuery(product);

  const runScopedSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) return;
    setIsSearching(true);
    try {
      const matches = await onFindAlternatives(query.trim());
      setAlternatives(matches);
    } finally {
      setIsSearching(false);
    }
  }, [onFindAlternatives]);

  return (
    <div className="mx-4 mb-1">
      {!isHelperVisible ? (
        <button
          type="button"
          onClick={() => setIsHelperVisible(true)}
          className="min-h-9 text-[11px] text-ink-2 underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
        >
          Mostrar ayuda para reemplazar producto
        </button>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line bg-sand px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-ink-2">
              ¿No encontraste lo que buscabas?
            </p>
            <button
              type="button"
              onClick={() => {
                setIsReplaceOpen(false);
                setIsHelperVisible(false);
              }}
              className="text-[11px] text-ink-2 underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
            >
              Ocultar
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsReplaceOpen(true);
              setReplaceQuery(suggestedQuery);
              await runScopedSearch(suggestedQuery);
            }}
            className="mt-1 inline-flex min-h-9 items-center gap-1 rounded-full bg-monte-soft px-2 py-1 text-[11px] font-medium text-monte transition-colors hover:bg-monte-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
          >
            Probá con: {suggestedQuery}
          </button>
        </div>
      )}
      {isReplaceOpen && isHelperVisible && (
        <div className="mt-1.5 rounded-[14px] border border-line bg-sand p-2">
          <div className="flex gap-1.5">
            <input
              value={replaceQuery}
              onChange={(event) => setReplaceQuery(event.target.value)}
              placeholder={product.searchTerm}
              className="h-9 w-full rounded-[12px] border border-line bg-paper px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
            />
            <button
              type="button"
              disabled={isSearching || replaceQuery.trim().length < 2}
              onClick={() => void runScopedSearch(replaceQuery)}
              className="min-h-9 rounded-[12px] bg-monte px-2.5 text-[11px] font-medium text-paper disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
            >
              Buscar
            </button>
          </div>
          {alternatives.length > 0 && (
            <div className="mt-2 space-y-1">
              {alternatives.slice(0, 4).map((alternative) => (
                <button
                  key={alternative.link}
                  type="button"
                  onClick={() => onSwap?.(alternative)}
                  className={cn(
                    "flex w-full min-h-9 items-center justify-between rounded-[12px] bg-paper px-2 py-1.5 text-left text-[11px] transition-colors",
                    "hover:bg-monte-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte",
                  )}
                >
                  <span className="line-clamp-2 pr-2 text-ink-2">{alternative.productName}</span>
                  <span className="shrink-0 font-semibold text-ink">{formatPrice(alternative.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
