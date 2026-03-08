"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { MealType } from "@/lib/llm/recipe-finder";
import type { AiJobTriggerResponse } from "@habita/contracts";

interface CocinaInput {
  textInput: string;
  images: string[];
  mealType: MealType;
}

/**
 * Mutation hook for Cocina recipe generation trigger.
 *
 * Now fires-and-forgets: the POST returns immediately with a job ID.
 * Polling for completion is handled by useAiJobStatus in the page component.
 */
export function useCocinaMutation() {
  return useMutation<AiJobTriggerResponse, Error, CocinaInput>({
    mutationKey: queryKeys.cocina.recipes(),
    mutationFn: (input: CocinaInput) =>
      apiFetch<AiJobTriggerResponse>("/api/ai/cocina", {
        method: "POST",
        body: input,
      }),
    gcTime: 5 * 60 * 1000,
  });
}
