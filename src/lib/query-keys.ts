import type { RelaxSection } from "@/lib/events/types";
import type { GroceryTab } from "@/lib/grocery-deals-scraper";
import { queryKeys as sharedKeys } from "@habita/contracts";

export const queryKeys = {
  ...sharedKeys,
  // Web-only keys
  relax: {
    all: () => ["relax"] as const,
    section: (section: RelaxSection) =>
      ["relax", section] as const,
  },
  notes: {
    all: () => ["notes"] as const,
    list: () => ["notes", "list"] as const,
  },
  inventory: {
    all: () => ["inventory"] as const,
    list: () => ["inventory", "list"] as const,
  },
  // Override grocery to add web-specific category key
  grocery: {
    ...sharedKeys.grocery,
    category: (category: GroceryTab) =>
      [...sharedKeys.grocery.all(), category] as const,
  },
} as const;
