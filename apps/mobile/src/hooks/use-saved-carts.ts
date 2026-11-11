import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { SavedCart, SaveCartInput, PriceChange, StoreMissingRefreshResult } from "@habita/contracts";

export interface RefreshedSavedCart extends SavedCart {
  status: "refreshed";
  priceChanges: PriceChange[];
}

export type RefreshSavedCartResult = RefreshedSavedCart | StoreMissingRefreshResult;


export function useSavedCarts() {
  return useQuery({
    queryKey: queryKeys.saved.carts(),
    queryFn: async () => mobileApi.get<SavedCart[]>("/api/saved-items/deals"),
  });
}

export function useSaveCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveCartInput) =>
      mobileApi.post<SavedCart>("/api/saved-items/deals", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.saved.carts() });
    },
  });
}

export function useDeleteSavedCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (savedCartId: string) =>
      mobileApi.delete<void>(`/api/saved-items/deals?id=${savedCartId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.saved.carts() });
    },
  });
}

/**
 * POST /api/saved-items/deals/refresh for a single cart.
 * Throws ApiError with status 503 when the store is unreachable (cart kept
 * as-is). Resolves with `status: "store-missing"` when the store answered
 * but no longer carries the cart.
 */
export function useRefreshSavedCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (savedCartId: string) =>
      mobileApi.post<RefreshSavedCartResult>("/api/saved-items/deals/refresh", { savedCartId }),
    onSuccess: (result) => {
      if (result.status !== "refreshed") return;
      queryClient.setQueryData<SavedCart[]>(queryKeys.saved.carts(), (current) =>
        current ? current.map((cart) => (cart.id === result.id ? result : cart)) : current,
      );
    },
  });
}
