/** Pure helpers for the Sorteo sheet (handoff §5.3/§8: no spinning wheel, a 600ms settle). */

export const SORTEO_ANIMATION_MS = 600;
export const SORTEO_WINNER_AVATAR_SIZE = 72;
export const SORTEO_LOSER_OPACITY = 0.35;
const IDLE_AVATAR_SIZE = 56;

/** Picks a random member id; `random` is injectable for deterministic tests. */
export function pickSorteoWinner(memberIds: readonly string[], random: () => number = Math.random): string | null {
  if (memberIds.length === 0) return null;
  const index = Math.min(Math.floor(random() * memberIds.length), memberIds.length - 1);
  return memberIds[index]!;
}

export interface SorteoAvatarStyle {
  size: number;
  opacity: number;
}

/** Before a result: everyone at idle size/opacity. After: the winner scales up, the rest dim. */
export function resolveSorteoAvatarStyle(memberId: string, winnerId: string | null): SorteoAvatarStyle {
  if (winnerId === null) return { size: IDLE_AVATAR_SIZE, opacity: 1 };
  if (memberId === winnerId) return { size: SORTEO_WINNER_AVATAR_SIZE, opacity: 1 };
  return { size: IDLE_AVATAR_SIZE, opacity: SORTEO_LOSER_OPACITY };
}
