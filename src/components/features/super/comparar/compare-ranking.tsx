import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoreChip } from "@/components/ds/store-chip";
import { formatPrice } from "./store-cart/helpers";

import type { AdjustedStoreCart, TodaysPromoPick } from "@habita/prices";

interface CompareRankingProps {
  carts: AdjustedStoreCart[];
  promoPicks: Map<string, TodaysPromoPick>;
  onSelectStore: (storeName: string) => void;
}

function buildInfoText(cart: AdjustedStoreCart): string {
  if (cart.missingTerms.length === 0) return `${cart.products.length}/${cart.totalSearched}`;
  const [firstMissing] = cart.missingTerms;
  if (cart.missingTerms.length === 1 && firstMissing) return `falta ${firstMissing}`;
  return `faltan ${cart.missingTerms.length} productos`;
}

/** Compact one-line-per-store ranking for every cart that isn't the hero winner. */
export function CompareRanking({ carts, promoPicks, onSelectStore }: CompareRankingProps): React.JSX.Element | null {
  if (carts.length === 0) return null;

  return (
    <div className="rounded-[20px] bg-surface px-4 py-1">
      {carts.map((cart) => {
        const isComplete = cart.missingTerms.length === 0;
        const promo = promoPicks.get(cart.storeName);
        return (
          <button
            key={cart.storeName}
            type="button"
            data-store-trigger={cart.storeName}
            onClick={() => onSelectStore(cart.storeName)}
            className="flex min-h-[52px] w-full items-center gap-3 rounded border-b border-line-soft text-left transition-colors last:border-b-0 hover:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
          >
            <span className="w-24 shrink-0">
              <StoreChip store={cart.storeName} />
            </span>
            <span className={cn("min-w-0 flex-1 truncate text-[13.5px]", isComplete ? "text-ink-2" : "text-ladrillo-text")}>
              {buildInfoText(cart)}
              {promo && ` · ${formatPrice(promo.discountedTotal)} con ${promo.bankDisplayName} hoy`}
            </span>
            <span className="shrink-0 font-semibold text-ink">{formatPrice(cart.totalPrice)}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
