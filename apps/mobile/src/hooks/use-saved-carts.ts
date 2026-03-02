import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { SavedCart, SaveCartInput } from "@habita/contracts";

const SAVED_CARTS_KEY = ["mobile", "saved-carts"] as const;

export function useSavedCarts() {
  return useQuery({
    queryKey: SAVED_CARTS_KEY,
    queryFn: async () => mobileApi.get<SavedCart[]>("/api/saved-items/deals"),
  });
}

export function useSaveCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveCartInput) =>
      mobileApi.post<SavedCart>("/api/saved-items/deals", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_CARTS_KEY });
    },
  });
}

export function useDeleteSavedCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (savedCartId: string) =>
      mobileApi.delete<void>(`/api/saved-items/deals?id=${savedCartId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_CARTS_KEY });
    },
  });
}

export function useRefreshSavedCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (savedCartId: string) =>
      mobileApi.post<SavedCart>("/api/saved-items/deals/refresh", { savedCartId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_CARTS_KEY });
    },
  });
}
