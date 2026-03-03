import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

/** Input shape for saving a recipe (mirrors web SaveRecipeInput). */
interface SaveRecipeInput {
  title: string;
  description: string;
  difficulty: "facil" | "media" | "dificil";
  prepTimeMinutes: number;
  servings: number;
  ingredients: string[];
  missingIngredients?: string[];
  steps: string[];
  tip?: string | null;
}

/** Shape returned by the API (mirrors Prisma SavedRecipe). */
interface SavedRecipe {
  id: string;
  contentHash: string;
  title: string;
  description: string;
  difficulty: string;
  prepTimeMinutes: number;
  servings: number;
  ingredients: string[];
  missingIngredients: string[];
  steps: string[];
  tip: string | null;
  savedAt: string;
}

const SAVED_RECIPES_KEY = ["mobile", "saved-recipes"] as const;

export function useSavedRecipes() {
  return useQuery({
    queryKey: SAVED_RECIPES_KEY,
    queryFn: async () => mobileApi.get<SavedRecipe[]>("/api/saved-items/recipes"),
    staleTime: 60_000,
  });
}

export function useToggleSaveRecipe() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (input: SaveRecipeInput) =>
      mobileApi.post<SavedRecipe>("/api/saved-items/recipes", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_RECIPES_KEY });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (savedRecipeId: string) =>
      mobileApi.delete<void>(`/api/saved-items/recipes?id=${savedRecipeId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_RECIPES_KEY });
    },
  });

  const toggle = useCallback(
    (params: { savedRecipeId?: string; input?: SaveRecipeInput }) => {
      if (params.savedRecipeId) {
        return removeMutation.mutateAsync(params.savedRecipeId);
      }
      if (params.input) {
        return saveMutation.mutateAsync(params.input);
      }
    },
    [saveMutation, removeMutation],
  );

  return {
    toggle,
    isPending: saveMutation.isPending || removeMutation.isPending,
  };
}

/** Check if a recipe is already saved (by content hash). */
export function isRecipeSaved(
  savedRecipes: SavedRecipe[] | undefined,
  contentHash: string,
): SavedRecipe | undefined {
  if (!savedRecipes) return undefined;
  return savedRecipes.find((r) => r.contentHash === contentHash);
}

export type { SavedRecipe, SaveRecipeInput };
