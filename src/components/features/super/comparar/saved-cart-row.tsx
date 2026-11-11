"use client";

import { Trash2 } from "lucide-react";
import { StoreChip } from "@/components/ds/store-chip";
import { formatCartAge, isCartStale } from "@habita/prices";

import type { SavedCart } from "@prisma/client";
import type { SavedCartRefreshResult } from "@/hooks/use-saved-cart-refresh";

interface SavedCartRowProps {
  cart: SavedCart;
  refreshResult?: SavedCartRefreshResult;
  onDelete: () => void;
}

function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function SavedCartRow({ cart, refreshResult, onDelete }: SavedCartRowProps): React.JSX.Element {
  const stale = isCartStale(cart.refreshedAt.toString());

  return (
    <div className="flex items-center gap-3 border-b border-line-soft py-3 last:border-b-0">
      <StoreChip store={cart.storeName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-medium text-ink">{formatPrice(cart.totalPrice)}</span>
        <span className="text-[13px] text-ink-2">
          {formatCartAge(cart.savedAt.toString())}
          {refreshResult?.unavailable && <span className="text-ladrillo-text"> · {cart.storeName} no responde ahora</span>}
          {refreshResult?.storeMissing && <span className="text-ink-2"> · ya no figura en tu zona</span>}
          {refreshResult && !refreshResult.unavailable && !refreshResult.storeMissing && refreshResult.changedCount > 0 && (
            <span> · cambió el precio de {refreshResult.changedCount} producto{refreshResult.changedCount === 1 ? "" : "s"}</span>
          )}
          {!refreshResult && stale && <span className="text-ladrillo-text"> · precios viejos</span>}
        </span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Eliminar carrito de ${cart.storeName}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-ink-3 transition-colors hover:text-ladrillo"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
