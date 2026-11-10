import { ChevronDown, MapPin, Pin, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoreLogo } from "@/components/ds/store-logo";
import { SaveButton } from "@/components/ds/save-button";
import type { AdjustedStoreCart } from "@habita/prices";
import { formatPrice } from "./helpers";

interface CartHeaderProps {
  cart: AdjustedStoreCart;
  isBest: boolean;
  isComplete: boolean;
  isPinned?: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  mapsUrl: string;
  discountedPrice: number | null;
  promoLabel: string | null;
  savingsPercent: number | null;
  onToggleSave?: () => void;
  isSaved?: boolean;
  isSavePending?: boolean;
}

export function CartHeader({
  cart,
  isBest,
  isComplete,
  isPinned,
  isOpen,
  onToggleOpen,
  mapsUrl,
  discountedPrice,
  promoLabel,
  savingsPercent,
  onToggleSave,
  isSaved,
  isSavePending,
}: CartHeaderProps) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="-m-2 flex min-w-0 flex-1 items-center gap-3 rounded-[14px] p-2 text-left outline-none transition-colors hover:bg-sand/60 focus-visible:ring-2 focus-visible:ring-monte"
        >
          <span className="relative block shrink-0">
            <StoreLogo storeName={cart.storeName} sizeClass="h-10 w-10" radiusClass="rounded-[14px]" fallbackFontClass="text-sm" />
            {isBest && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-manteca">
                <Trophy className="h-2.5 w-2.5 text-paper" strokeWidth={1.75} aria-hidden="true" />
              </span>
            )}
            {isPinned && !isBest && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-monte">
                <Pin className="h-2.5 w-2.5 text-paper" strokeWidth={1.75} aria-hidden="true" />
              </span>
            )}
          </span>

          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="flex-1 truncate text-sm font-semibold text-ink">{cart.storeName}</span>
            {isBest && isComplete && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-monte-soft px-2 py-0.5 text-[12px] font-semibold text-monte">
                Mejor opción
              </span>
            )}
            {isBest && !isComplete && (
              <span className="shrink-0 rounded-full bg-manteca-soft px-2 py-0.5 text-[10px] font-semibold text-manteca-text">
                Mejor precio
              </span>
            )}
          </span>

          <span className="block shrink-0 text-right">
            {discountedPrice != null && promoLabel ? (
              <>
                <span className="block text-[11px] text-ink-2 line-through">
                  {formatPrice(cart.totalPrice)}
                </span>
                <span className="block text-lg font-bold text-monte">
                  {formatPrice(discountedPrice)}
                </span>
                <span className="block text-[10px] font-medium text-monte">{promoLabel}</span>
              </>
            ) : (
              <>
                <span className={cn("block text-lg font-bold", isBest ? "text-monte" : "text-ink")}>
                  {formatPrice(cart.totalPrice)}
                </span>
                {savingsPercent != null && savingsPercent !== 0 && (
                  <span className={cn("block text-[11px] font-medium", savingsPercent > 0 ? "text-monte" : "text-ladrillo-text")}>
                    {savingsPercent > 0 ? `${savingsPercent}% menos` : `+${Math.abs(savingsPercent)}% vs prom.`}
                  </span>
                )}
              </>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-2 transition-transform duration-200", isOpen && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />
        </button>

        {onToggleSave && (
          <SaveButton
            isSaved={isSaved ?? false}
            isPending={isSavePending ?? false}
            onToggle={onToggleSave}
            size="md"
          />
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-[52px]">
        <p className="text-xs text-ink-2">
          {cart.products.length} de {cart.totalSearched} producto{cart.totalSearched !== 1 ? "s" : ""}
          {cart.cheapestCount > 0 && (
            <>
              {" · "}
              <span className="text-monte">
                {cart.cheapestCount} al mejor precio
              </span>
            </>
          )}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex min-h-9 items-center gap-0.5 rounded-full bg-sand px-2 py-0.5 text-[10px] font-medium text-ink-2 transition-colors hover:bg-monte-soft hover:text-monte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte"
          title="Cómo llegar"
        >
          <MapPin className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden="true" />
          Cómo llegar
        </a>
      </div>
    </div>
  );
}
