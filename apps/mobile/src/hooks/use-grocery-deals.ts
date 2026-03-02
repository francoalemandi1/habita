import { useMutation } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

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

// ── Hook ───────────────────────────────────────────────────────────────────

export function useGroceryDeals() {
  return useMutation({
    mutationFn: async (input: GroceryDealsInput) =>
      mobileApi.post<GroceryDealsResponse>("/api/ai/grocery-deals", input),
  });
}
