"use client";

import { Bookmark } from "lucide-react";
import { useSavedCarts, useToggleSaveCart } from "@/hooks/use-saved-items";
import { useSavedCartAutoRefresh } from "@/hooks/use-saved-cart-refresh";
import { SavedCartRow } from "@/components/features/super/comparar/saved-cart-row";

/** "Carritos guardados" — auto-refreshes stale carts once per mount (handoff §5.3). */
export function SavedCartsSection(): React.JSX.Element | null {
  const { data: savedCarts } = useSavedCarts();
  const { toggle: toggleSaveCart } = useToggleSaveCart();
  const { results } = useSavedCartAutoRefresh(savedCarts);

  if (!savedCarts || savedCarts.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
        <Bookmark className="size-3.5" strokeWidth={1.75} />
        Carritos guardados
      </div>
      <div className="flex flex-col rounded-[16px] bg-paper px-3.5">
        {savedCarts.map((cart) => (
          <SavedCartRow
            key={cart.id}
            cart={cart}
            refreshResult={results.find((result) => result.cartId === cart.id)}
            onDelete={() => void toggleSaveCart({ savedCartId: cart.id })}
          />
        ))}
      </div>
    </div>
  );
}
