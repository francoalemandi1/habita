import { StoreChip } from "@/components/ds/store-chip";
import { formatPrice } from "./store-cart/helpers";

import type { AdjustedStoreCart } from "@habita/prices";

interface CompareHeroProps {
  cart: AdjustedStoreCart;
  savingsVsMax: number;
  mapsUrl: string;
  onViewCart: () => void;
}

/** Winning store at the top of the comparison: label, chip, total and quick actions. */
export function CompareHero({ cart, savingsVsMax, mapsUrl, onViewCart }: CompareHeroProps): React.JSX.Element {
  const isComplete = cart.missingTerms.length === 0;
  const label = isComplete
    ? `CONVIENE · ${cart.products.length} DE ${cart.totalSearched} PRODUCTOS`
    : `MEJOR PRECIO · ${cart.products.length} DE ${cart.totalSearched} PRODUCTOS`;

  return (
    <div className="rounded-[20px] bg-surface p-5">
      <p className="text-[12px] font-semibold uppercase tracking-[.08em] text-ink-2">{label}</p>
      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <StoreChip store={cart.storeName} />
          <p className="mt-2 text-[44px] font-bold leading-none tracking-[-.045em] text-ink md:text-[52px]">
            {formatPrice(cart.totalPrice)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 md:items-end">
          {savingsVsMax > 0 && (
            <span className="rounded-full bg-manteca-soft px-2.5 py-1 text-[12px] font-medium text-manteca-text">
              ahorrás {formatPrice(savingsVsMax)} vs. el más caro
            </span>
          )}
          <p className="text-[13px] text-ink-2">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte">
              Cómo llegar
            </a>
            {" · "}
            <button
              type="button"
              data-store-trigger={cart.storeName}
              onClick={onViewCart}
              className="min-h-11 align-middle font-semibold text-monte underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
            >
              Ver carrito
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
