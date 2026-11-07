import { useMutationState } from "@tanstack/react-query";

/**
 * Ids extracted from the variables of every offline-queued (paused) mutation
 * under `mutationKey`. Backs the `PendingDot` shown on A/B rows until the
 * queue drains (§7 Sin conexión); an in-flight online save shows no dot.
 */
export function usePendingMutationIds(
  mutationKey: readonly unknown[],
  extractId: (variables: unknown) => string | null,
): Set<string> {
  const ids = useMutationState({
    filters: { mutationKey: [...mutationKey], predicate: (mutation) => mutation.state.isPaused },
    select: (mutation) => extractId(mutation.state.variables),
  });
  return new Set(ids.filter((id): id is string => id !== null));
}

/** For mutations whose variables are the plain id string (e.g. an assignmentId). */
export function readStringVariable(variables: unknown): string | null {
  return typeof variables === "string" ? variables : null;
}

/** Reads a string field off object-shaped mutation variables. */
export function readStringField(variables: unknown, field: string): string | null {
  if (typeof variables !== "object" || variables === null || !(field in variables)) return null;
  const value: unknown = Reflect.get(variables, field);
  return typeof value === "string" ? value : null;
}
