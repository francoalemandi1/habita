import { useMutation } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type {
  SearchItem,
  ShoppingPlanAlternativesResponse,
  ShoppingPlanResult,
} from "@habita/contracts";

interface ShoppingPlanInput {
  searchItems: SearchItem[];
}

export function useShoppingPlan() {
  return useMutation({
    mutationFn: async (input: ShoppingPlanInput) =>
      mobileApi.post<ShoppingPlanResult>("/api/ai/shopping-plan", input),
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
