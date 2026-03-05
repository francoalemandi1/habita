import { useMutation } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { MealType, Recipe, CocinaResponse, CocinaInput } from "@habita/contracts";

export type { MealType, Recipe, CocinaResponse, CocinaInput };

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCocina() {
  return useMutation({
    mutationFn: async (input: CocinaInput) =>
      mobileApi.post<CocinaResponse>("/api/ai/cocina", {
        textInput: input.textInput,
        mealType: input.mealType,
        images: input.images ?? [],
      }),
  });
}
