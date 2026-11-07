/** Pure helper for the Rotaciones pattern text (handoff §5.3: "Vos → Sofi → Tomi · todos los días"). */

import type { TaskFrequency } from "@habita/contracts";

const FREQUENCY_PATTERN_LABELS: Record<TaskFrequency, string> = {
  DAILY: "todos los días",
  WEEKLY: "una vez por semana",
  BIWEEKLY: "cada 15 días",
  MONTHLY: "una vez por mes",
  ONCE: "una vez",
};

export interface RotationMemberOrder {
  id: string;
  name: string;
}

/** Builds "A → B → C · <frecuencia>" with the current member shown as "Vos", in stable member-id order. */
export function buildRotationPattern(
  membersInOrder: readonly RotationMemberOrder[],
  currentMemberId: string,
  frequency: TaskFrequency,
): string {
  const names = membersInOrder.map((member) => (member.id === currentMemberId ? "Vos" : member.name));
  return `${names.join(" → ")} · ${FREQUENCY_PATTERN_LABELS[frequency]}`;
}
