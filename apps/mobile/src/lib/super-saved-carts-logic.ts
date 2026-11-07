/**
 * Pure logic for the "Carritos guardados" section inside Comparar (design
 * handoff §5.3). Duplicated from src/lib/super-saved-carts-logic.ts (web).
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AUTO_REFRESH = 3;

export function isCartStale(refreshedAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(refreshedAt).getTime() > ONE_DAY_MS;
}

/** "hace N día/hora/minuto(s)" relative age, from `savedAt` or `refreshedAt`. */
export function formatCartAge(isoDate: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} minuto${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}

/**
 * Picks which stale carts to auto-refresh on mount: oldest `refreshedAt` first,
 * capped at `MAX_AUTO_REFRESH` so one mount never fires more than 3 requests.
 */
export function pickCartsToAutoRefresh<T extends { id: string; refreshedAt: string }>(
  carts: T[],
  now: Date = new Date(),
): T[] {
  return carts
    .filter((cart) => isCartStale(cart.refreshedAt, now))
    .sort((a, b) => new Date(a.refreshedAt).getTime() - new Date(b.refreshedAt).getTime())
    .slice(0, MAX_AUTO_REFRESH);
}
