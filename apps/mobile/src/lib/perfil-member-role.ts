import type { MemberType } from "@habita/contracts";

const ROLE_LABELS: Record<MemberType, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño/a",
};

export function getMemberRoleLabel(memberType: MemberType): string {
  return ROLE_LABELS[memberType];
}
