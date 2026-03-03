import { useMutation, useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

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

// ── Types ──────────────────────────────────────────────────────────────────

export type GroceryCategory =
  | "almacen"
  | "panaderia_dulces"
  | "lacteos"
  | "carnes"
  | "frutas_verduras"
  | "bebidas"
  | "limpieza"
  | "perfumeria";

export interface ProductPrice {
  productName: string;
  store: string;
  price: string;
  originalPrice: string | null;
  discount: string;
  savingsPercent: number | null;
  sourceUrl: string;
  source: string;
}

export interface StoreCluster {
  storeName: string;
  productCount: number;
  products: ProductPrice[];
  totalEstimatedSavings: number;
  averageDiscountPercent: number;
  score: number;
}

export interface GroceryDealsResponse {
  clusters: StoreCluster[];
  recommendation: string;
  productsNotFound: string[];
  generatedAt: string;
  cached?: boolean;
}

export interface GroceryDealsInput {
  category: GroceryCategory;
  city?: string;
  country?: string;
  forceRefresh?: boolean;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useGroceryDeals() {
  return useMutation({
    mutationFn: async (input: GroceryDealsInput) =>
      mobileApi.post<GroceryDealsResponse>("/api/ai/grocery-deals", input),
  });
}

/** Auto-fetches the best deal for today's rotating category. Cached for 4h. */
export function useDailyDeal() {
  const category = getTodayCategory();
  return useQuery({
    queryKey: ["mobile", "daily-deal", category],
    queryFn: async () =>
      mobileApi.post<GroceryDealsResponse>("/api/ai/grocery-deals", {
        category,
        forceRefresh: false,
      }),
    staleTime: 4 * 60 * 60 * 1000, // 4 hours — AI call is expensive
    retry: 1,
  });
}
