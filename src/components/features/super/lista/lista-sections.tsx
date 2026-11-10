"use client";

import { useId } from "react";
import { Button } from "@/components/ds/button";

import type { ShoppingListItem } from "@habita/contracts";

interface ListaSectionsProps {
  pending: ShoppingListItem[];
  inCart: ShoppingListItem[];
  renderRow: (item: ShoppingListItem) => React.ReactNode;
  onClearCart: () => void;
  isClearing: boolean;
}

/** What's still missing, then a visible "En el carrito" section so checked rows never just disappear. */
export function ListaSections({ pending, inCart, renderRow, onClearCart, isClearing }: ListaSectionsProps): React.JSX.Element {
  const cartTitleId = useId();

  return (
    <div className="flex flex-col">
      {pending.map(renderRow)}
      {pending.length === 0 && (
        <p className="py-3 text-[15px] text-ink-2">Ya tenés todo en el carrito.</p>
      )}

      {inCart.length > 0 && (
        <section aria-labelledby={cartTitleId} className="mt-3 flex flex-col border-t border-line pt-3">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h3 id={cartTitleId} className="text-[13px] font-semibold uppercase tracking-[.06em] text-ink-2">
              En el carrito · {inCart.length}
            </h3>
            <Button variant="link" size="sm" onClick={onClearCart} loading={isClearing} loadingLabel="Sacando" className="min-h-11 text-ink-2">
              Sacar de la lista
            </Button>
          </div>
          {inCart.map(renderRow)}
        </section>
      )}
    </div>
  );
}
