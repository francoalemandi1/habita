/**
 * Maps a shopping-list mutation's variables to the row id it affects, so the
 * PendingDot can match a paused "add" (clientId → the optimistic `pending-*`
 * id) or "update" (itemId) mutation to the right row.
 */
export function extractShoppingListPendingId(variables: unknown): string {
  if (typeof variables !== "object" || variables === null) return "";
  if ("itemId" in variables && typeof variables.itemId === "string") return variables.itemId;
  if ("clientId" in variables && typeof variables.clientId === "string") return `pending-${variables.clientId}`;
  return "";
}
