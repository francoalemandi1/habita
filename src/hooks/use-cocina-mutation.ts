"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { Recipe, MealType } from "@/lib/llm/recipe-finder";

interface CocinaInput {
  textInput: string;
  images: string[];
  mealType: MealType;
}

interface CocinaResult {
  recipes: Recipe[];
  summary: string;
  generatedAt: string;
}

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * Mutation hook for Cocina recipe generation.
 *
 * Uses `mutationKey` so the mutation state (data, error, isPending) is stored
 * in the shared MutationCache and survives component unmount/remount for up
 * to 30 minutes. This lets users navigate away while the AI generates recipes
 * and come back to see the results.
 */
export function useCocinaMutation() {
  return useMutation<CocinaResult, Error, CocinaInput>({
    mutationKey: queryKeys.cocina.recipes(),
    mutationFn: (input: CocinaInput) =>
      apiFetch<CocinaResult>("/api/ai/cocina", {
        method: "POST",
        body: input,
      }),
    gcTime: THIRTY_MINUTES_MS,
  });
}
