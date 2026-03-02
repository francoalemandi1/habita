import { useMutation } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export type MealType = "almuerzo" | "cena" | "merienda" | "libre";

export interface Recipe {
  title: string;
  description: string;
  difficulty: "facil" | "media" | "dificil";
  prepTimeMinutes: number;
  servings: number;
  ingredients: string[];
  missingIngredients: string[];
  steps: string[];
  tip: string | null;
}

export interface CocinaResponse {
  recipes: Recipe[];
  summary: string;
  generatedAt: string;
}

export interface CocinaInput {
  textInput: string;
  mealType: MealType;
  images?: string[]; // base64 — optional for future camera support
}

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
