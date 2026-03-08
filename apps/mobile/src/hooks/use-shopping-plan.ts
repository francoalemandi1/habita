import { useMutation, useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";
import { queryKeys } from "@habita/contracts";
import type {
  AiJobTriggerResponse,
  SearchItem,
  ShoppingPlanAlternativesResponse,
  ShoppingPlanResult,
} from "@habita/contracts";

export interface ProductCatalogItem {
  id: string;
  name: string;
  category: string;
  isEssential: boolean;
}

interface ProductCatalogResponse {
  products: ProductCatalogItem[];
  excludedProductNames: string[];
}

interface ShoppingPlanInput {
  searchItems: SearchItem[];
}

export function useShoppingPlan() {
  return useMutation({
    mutationFn: async (input: ShoppingPlanInput) =>
      mobileApi.post<AiJobTriggerResponse>("/api/ai/shopping-plan", input),
  });
}

interface AlternativesInput {
  storeName: string;
  searchTerm: string;
  query: string;
}

export function useShoppingAlternatives() {
  return useMutation({
    mutationFn: async (input: AlternativesInput) =>
      mobileApi.post<ShoppingPlanAlternativesResponse>(
        "/api/ai/shopping-plan/alternatives",
        input,
      ),
  });
}

export function useProductCatalog() {
  return useQuery({
    queryKey: queryKeys.grocery.productSelection(),
    queryFn: async () => mobileApi.get<ProductCatalogResponse>("/api/shopping-plan/products"),
    staleTime: 10 * 60 * 1000,
  });
}
