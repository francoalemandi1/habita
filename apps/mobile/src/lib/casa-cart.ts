import type { SavedCart } from "@habita/contracts";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "hace 2 días" / "hace 1 hora" / "hace un momento" relative label for a saved cart's age. */
export function formatRelativeAge(savedAt: string, now: Date): string {
  const savedDate = new Date(savedAt);
  const diffMs = now.getTime() - savedDate.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "hace un momento";

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) return "hace un momento";
  if (diffMinutes < 60) return `hace ${diffMinutes} minuto${diffMinutes === 1 ? "" : "s"}`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? "" : "s"}`;

  const diffDays = Math.floor(diffMs / DAY_MS);
  return `hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
}

/** The most recently saved cart, or null when there are none. */
export function pickLatestCart(carts: readonly SavedCart[]): SavedCart | null {
  if (carts.length === 0) return null;
  return carts.reduce((latest, cart) => (new Date(cart.savedAt) > new Date(latest.savedAt) ? cart : latest));
}
