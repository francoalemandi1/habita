import { completeAssignmentMutationFn, uncompleteAssignmentMutationFn } from "@/hooks/use-assignments";
import { addShoppingListItemMutationFn, updateShoppingListItemMutationFn } from "@/hooks/use-shopping-list";
import { performAnotarSaveMutationFn } from "@/hooks/use-anotar-save";

import { isNetworkError } from "./offline-network";
import { OFFLINE_MUTATION_KEYS } from "./offline-mutation-keys";

import type { QueryClient } from "@tanstack/react-query";

const MAX_NETWORK_RETRIES = 3;

function networkOnlyRetry(failureCount: number, error: unknown): boolean {
  return isNetworkError(error) && failureCount < MAX_NETWORK_RETRIES;
}

/**
 * Registers `mutationFn` for every queued (A/B) mutation by its stable
 * mutationKey. Functions can't be serialized, so a persisted, paused mutation
 * has none after an app restart — `resumePausedMutations()` looks them up
 * here via `QueryClient.defaultMutationOptions`. Must run before the
 * persisted client is restored and hydrated (see `query-provider.tsx`).
 */
export function registerOfflineMutationDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(OFFLINE_MUTATION_KEYS.completeAssignment, {
    mutationFn: completeAssignmentMutationFn,
    retry: networkOnlyRetry,
  });
  queryClient.setMutationDefaults(OFFLINE_MUTATION_KEYS.uncompleteAssignment, {
    mutationFn: uncompleteAssignmentMutationFn,
    retry: networkOnlyRetry,
  });
  queryClient.setMutationDefaults(OFFLINE_MUTATION_KEYS.addShoppingListItem, {
    mutationFn: addShoppingListItemMutationFn,
    retry: networkOnlyRetry,
  });
  queryClient.setMutationDefaults(OFFLINE_MUTATION_KEYS.updateShoppingListItem, {
    mutationFn: updateShoppingListItemMutationFn,
    retry: networkOnlyRetry,
  });
  queryClient.setMutationDefaults(OFFLINE_MUTATION_KEYS.anotarSave, {
    mutationFn: performAnotarSaveMutationFn,
    retry: networkOnlyRetry,
  });
}
