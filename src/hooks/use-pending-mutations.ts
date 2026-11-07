"use client";

import { useMutationState } from "@tanstack/react-query";

/**
 * IDs with an offline-queued (paused) mutation whose key starts with
 * `mutationKeyPrefix`, e.g. `["assignment"]` covers both the complete and
 * uncomplete mutations (handoff §7 "Sin conexión" — pending dot).
 */
export function usePendingMutationIds(
  mutationKeyPrefix: readonly unknown[],
  extractId: (variables: unknown) => string,
): Set<string> {
  const ids = useMutationState({
    filters: {
      mutationKey: [...mutationKeyPrefix],
      predicate: (mutation) => mutation.state.isPaused,
    },
    select: (mutation) => extractId(mutation.state.variables),
  });
  return new Set(ids.filter((id) => id.length > 0));
}

/** For mutations whose variables are the plain id string (e.g. an assignmentId). */
export function extractStringVariable(variables: unknown): string {
  return typeof variables === "string" ? variables : "";
}
