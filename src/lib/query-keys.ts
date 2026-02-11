import type { RelaxSection } from "@/lib/llm/relax-finder";

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
} as const;
