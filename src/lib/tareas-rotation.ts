export interface RotationMemberLite {
  id: string;
  name: string;
}

const FREQUENCY_PATTERN_LABELS: Record<string, string> = {
  DAILY: "todos los días",
  WEEKLY: "cada semana",
  BIWEEKLY: "cada 2 semanas",
  MONTHLY: "cada mes",
  ONCE: "una vez",
};

/** "Vos → Sofi → Tomi · todos los días" — stable member-id order, "Vos" for the current member. */
export function buildRotationPatternText(
  members: readonly RotationMemberLite[],
  currentMemberId: string,
  frequency: string,
): string {
  const ordered = [...members].sort((a, b) => a.id.localeCompare(b.id));
  const names = ordered.map((member) => (member.id === currentMemberId ? "Vos" : member.name));
  const frequencyLabel = FREQUENCY_PATTERN_LABELS[frequency] ?? frequency;
  return `${names.join(" → ")} · ${frequencyLabel}`;
}
