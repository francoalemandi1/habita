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
  const ratio = `${cart.products.length}/${cart.totalSearched}`;
  if (cart.missingTerms.length === 0) return ratio;
  const [firstMissing] = cart.missingTerms;
  if (cart.missingTerms.length === 1 && firstMissing) return `${ratio} · falta ${firstMissing}`;
  return `${ratio} · faltan ${cart.missingTerms.length} productos`;
}

/** Render carts with a complete match before incomplete ones; the data layer doesn't sort by completeness. */
function sortByCompleteness(carts: AdjustedStoreCart[]): AdjustedStoreCart[] {
  return [...carts].sort((a, b) => Number(a.missingTerms.length > 0) - Number(b.missingTerms.length > 0));
}

/** Compact one-line-per-store ranking for every cart that isn't the hero winner. */
export function CompareRanking({ carts, promoPicks, onSelectStore }: CompareRankingProps): React.JSX.Element | null {
  if (carts.length === 0) return null;

  return (
    <div className="rounded-[20px] bg-surface px-4 py-1">
      {sortByCompleteness(carts).map((cart) => {
        const isComplete = cart.missingTerms.length === 0;
        const promo = promoPicks.get(cart.storeName);
        return (
          <button
            key={cart.storeName}
            type="button"
            data-store-trigger={cart.storeName}
            onClick={() => onSelectStore(cart.storeName)}
            className="flex min-h-[60px] w-full items-center gap-3 rounded border-b border-line-soft py-2 text-left transition-colors last:border-b-0 hover:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
          >
            <span className="w-24 shrink-0">
              <StoreChip store={cart.storeName} />
            </span>
            <span className={cn("min-w-0 flex-1 line-clamp-2 text-[13.5px]", isComplete ? "text-ink-2" : "text-ladrillo-text")}>
              {buildInfoText(cart)}
              {promo && ` · ${formatPrice(promo.discountedTotal)} con ${promo.bankDisplayName} hoy`}
            </span>
            <span className={cn("shrink-0", isComplete ? "font-semibold text-ink" : "font-medium text-ink-2")}>
              {formatPrice(cart.totalPrice)}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
