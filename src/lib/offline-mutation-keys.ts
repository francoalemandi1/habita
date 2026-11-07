/**
 * Stable mutationKey tuples for every queued A/B mutation (R8c "Sin conexión").
 * The first segment doubles as a filter prefix for `usePendingMutationIds`.
 */
export const OFFLINE_MUTATION_KEYS = {
  anotarExpense: ["anotar", "expense"],
  anotarTask: ["anotar", "task"],
  anotarItem: ["anotar", "item"],
  assignmentComplete: ["assignment", "complete"],
  assignmentUncomplete: ["assignment", "uncomplete"],
  shoppingItemAdd: ["shopping-item", "add"],
  shoppingItemUpdate: ["shopping-item", "update"],
} as const;
