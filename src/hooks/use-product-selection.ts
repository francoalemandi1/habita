"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { GroceryCategory } from "@prisma/client";

// ============================================
// Types
// ============================================

export interface ProductCatalogItem {
  id: string;
  name: string;
  category: GroceryCategory;
  isEssential: boolean;
}

export interface ProductSelectionResponse {
  products: ProductCatalogItem[];
  excludedProductNames: string[];
}

// ============================================
// Hooks
// ============================================

const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * Query hook for the product catalog + household exclusions.
 */
export function useProductSelection() {
  return useQuery<ProductSelectionResponse>({
    queryKey: queryKeys.grocery.productSelection(),
    queryFn: () =>
      apiFetch<ProductSelectionResponse>("/api/shopping-plan/products"),
    staleTime: TEN_MINUTES_MS,
  });
}

/**
 * Mutation hook to save product exclusions.
 * Invalidates both productSelection and shoppingPlan queries on success.
 */
export function useSaveProductExclusions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (excludedProductNames: string[]) =>
      apiFetch("/api/shopping-plan/products", {
        method: "PUT",
        body: { excludedProductNames },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.grocery.productSelection(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.grocery.shoppingPlan(),
      });
    },
  });
}
