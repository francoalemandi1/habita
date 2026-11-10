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
    <section aria-label="Carritos guardados" className="flex flex-col gap-1 rounded-[20px] bg-surface px-4 py-4 md:px-5">
      <h2 className="flex items-center gap-1.5 text-[17px] font-semibold text-ink">
        <Bookmark className="size-4 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
        Carritos guardados
      </h2>
      <div className="flex flex-col">
        {savedCarts.map((cart) => (
          <SavedCartRow
            key={cart.id}
            cart={cart}
            refreshResult={results.find((result) => result.cartId === cart.id)}
            onDelete={() => void toggleSaveCart({ savedCartId: cart.id })}
          />
        ))}
      </div>
    </section>
  );
}
