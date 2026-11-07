import { useEffect, useRef, useState } from "react";
import { ApiError } from "@habita/api-client";
import { pickCartsToAutoRefresh } from "@habita/prices";
import { useRefreshSavedCart } from "@/hooks/use-saved-carts";

import type { SavedCart } from "@habita/contracts";

export interface SavedCartRefreshResult {
  cartId: string;
  storeName: string;
  changedCount: number;
  unavailable: boolean;
}

/**
 * Auto-refreshes stale saved carts (design handoff §5.3) once per mount:
 * sequential, capped at 3, skipped entirely if nothing is stale. A store
 * down (503) keeps the cart untouched and is reported, not retried within
 * this mount.
 */
export function useSavedCartAutoRefresh(carts: SavedCart[] | undefined) {
  const [results, setResults] = useState<SavedCartRefreshResult[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasRunRef = useRef(false);
  const refreshMutation = useRefreshSavedCart();

  useEffect(() => {
    if (hasRunRef.current || !carts || carts.length === 0) return;
    hasRunRef.current = true;
    const currentCarts = carts;

    const toRefresh = pickCartsToAutoRefresh(
      currentCarts.map((cart) => ({ id: cart.id, refreshedAt: cart.refreshedAt })),
    );
    if (toRefresh.length === 0) return;

    async function run(): Promise<void> {
      setIsRefreshing(true);
      const collected: SavedCartRefreshResult[] = [];
      for (const target of toRefresh) {
        const cart = currentCarts.find((c) => c.id === target.id);
        if (!cart) continue;
        try {
          const updated = await refreshMutation.mutateAsync(cart.id);
          collected.push({
            cartId: cart.id,
            storeName: cart.storeName,
            changedCount: updated.priceChanges.length,
            unavailable: false,
          });
        } catch (error) {
          // Only 503 means "store down"; anything else (404 = store answered
          // without this cart, network, 5xx) is logged and left for a manual refresh.
          const isUnavailable = error instanceof ApiError && error.status === 503;
          if (!isUnavailable) {
            console.warn(`[saved-carts] auto-refresh failed for ${cart.storeName}`, error);
            continue;
          }
          collected.push({ cartId: cart.id, storeName: cart.storeName, changedCount: 0, unavailable: true });
        }
      }
      setResults(collected);
      setIsRefreshing(false);
    }

    void run();
    // `hasRunRef` enforces the once-per-mount contract even though `carts`
    // identity changes on every invalidation.
  }, [carts, refreshMutation]);

  return { results, isRefreshing };
}
