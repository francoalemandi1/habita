import type { RelaxSection } from "@/lib/llm/relax-finder";
import type { GroceryTab } from "@/lib/llm/grocery-advisor";

export const queryKeys = {
  cocina: {
    all: ["cocina"] as const,
    recipes: () => [...queryKeys.cocina.all, "recipes"] as const,
  },
  relax: {
    all: ["relax"] as const,
    section: (section: RelaxSection) =>
      [...queryKeys.relax.all, section] as const,
  },
  grocery: {
    all: ["grocery"] as const,
    category: (category: GroceryTab) =>
      [...queryKeys.grocery.all, category] as const,
    shoppingPlan: () => [...queryKeys.grocery.all, "plan"] as const,
    productSelection: () => [...queryKeys.grocery.all, "product-selection"] as const,
  },
} as const;
