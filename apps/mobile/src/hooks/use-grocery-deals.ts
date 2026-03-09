import { useMutation, useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type {
  GroceryCategory,
  ProductPrice,
  StoreCluster,
  GroceryDealsResponse,
  GroceryDealsInput,
  TopDealsResponse,
} from "@habita/contracts";

export type {
  GroceryCategory,
  ProductPrice,
  StoreCluster,
  GroceryDealsResponse,
  GroceryDealsInput,
  TopDealsResponse,
};

// Rotate through categories daily so the dashboard always shows something fresh
const DAILY_CATEGORIES: GroceryCategory[] = [
  "almacen", "lacteos", "frutas_verduras", "bebidas", "limpieza",
];

export function getTodayCategory(): GroceryCategory {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return DAILY_CATEGORIES[dayOfYear % DAILY_CATEGORIES.length]!;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useGroceryDeals() {
  return useMutation({
    mutationFn: async (input: GroceryDealsInput) =>
      mobileApi.post<GroceryDealsResponse>("/api/ai/grocery-deals", input),
  });
}

/** Top deals across all categories. Reads from server-side cache. */
export function useTopDeals() {
  return useQuery<TopDealsResponse>({
    queryKey: queryKeys.grocery.topDeals(),
    queryFn: async () =>
      mobileApi.get<TopDealsResponse>("/api/ai/grocery-deals/top"),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** Auto-fetches the best deal for today's rotating category. Cached for 4h. */
export function useDailyDeal() {
  const category = getTodayCategory();
  return useQuery({
    queryKey: queryKeys.grocery.deals(category),
    queryFn: async () =>
      mobileApi.post<GroceryDealsResponse>("/api/ai/grocery-deals", {
        category,
        forceRefresh: false,
      }),
    staleTime: 4 * 60 * 60 * 1000, // 4 hours — AI call is expensive
    retry: 1,
  });
}
