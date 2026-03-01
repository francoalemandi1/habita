import type { RelaxSection } from "@/lib/events/types";
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
  events: {
    all: ["events"] as const,
    pipelineStatus: () => [...queryKeys.events.all, "pipeline-status"] as const,
    list: (cityId?: string, category?: string) =>
      [...queryKeys.events.all, "list", cityId ?? "all", category ?? "all"] as const,
    weekend: (cityId?: string) =>
      [...queryKeys.events.all, "weekend", cityId ?? "all"] as const,
  },
  grocery: {
    all: ["grocery"] as const,
    category: (category: GroceryTab) =>
      [...queryKeys.grocery.all, category] as const,
    shoppingPlan: () => [...queryKeys.grocery.all, "plan"] as const,
    productSelection: () => [...queryKeys.grocery.all, "product-selection"] as const,
  },
  services: {
    all: ["services"] as const,
    list: () => [...queryKeys.services.all, "list"] as const,
  },
  saved: {
    all: ["saved"] as const,
    events: () => [...queryKeys.saved.all, "events"] as const,
    recipes: () => [...queryKeys.saved.all, "recipes"] as const,
    deals: () => [...queryKeys.saved.all, "deals"] as const,
  },
  notes: {
    all: ["notes"] as const,
    list: () => [...queryKeys.notes.all, "list"] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    list: () => [...queryKeys.inventory.all, "list"] as const,
  },
  promos: {
    all: ["promos"] as const,
    list: () => [...queryKeys.promos.all, "list"] as const,
    pipelineStatus: () => [...queryKeys.promos.all, "pipeline-status"] as const,
  },
} as const;
