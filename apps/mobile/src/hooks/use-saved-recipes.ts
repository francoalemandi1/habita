import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { SaveRecipeInput, SavedRecipe } from "@habita/contracts";

export type { SaveRecipeInput, SavedRecipe };


export function useSavedRecipes() {
  return useQuery({
    queryKey: queryKeys.saved.recipes(),
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.saved.recipes() });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (savedRecipeId: string) =>
      mobileApi.delete<void>(`/api/saved-items/recipes?id=${savedRecipeId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.saved.recipes() });
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
