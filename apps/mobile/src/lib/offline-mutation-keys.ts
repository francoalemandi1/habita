/**
 * Stable mutationKeys for pattern A/B mutations that must survive an app
 * restart while paused offline (§7 Sin conexión / §11 Estado y datos).
 * `queryClient.setMutationDefaults(key, { mutationFn, retry })` is registered
 * for each of these in `offline-mutation-registry.ts` before the persisted
 * query client is restored, so `resumePausedMutations()` has a function to run.
 */
export const OFFLINE_MUTATION_KEYS = {
  completeAssignment: ["offline", "complete-assignment"],
  uncompleteAssignment: ["offline", "uncomplete-assignment"],
  addShoppingListItem: ["offline", "add-shopping-item"],
  updateShoppingListItem: ["offline", "update-shopping-item"],
  anotarSave: ["offline", "anotar-save"],
} as const;
