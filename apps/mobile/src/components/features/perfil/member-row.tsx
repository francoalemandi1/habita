import { Avatar, ListRow } from "@/components/ds";
import { getMemberRoleLabel } from "@/lib/perfil-member-role";

import type { MemberSummary } from "@habita/contracts";

export interface MemberRowProps {
  member: MemberSummary;
  isCurrentUser: boolean;
}

/** §5.3 Perfil — household members with a role label and "Vos" on your own row. */
export function MemberRow({ member, isCurrentUser }: MemberRowProps): React.JSX.Element {
  const roleLabel = getMemberRoleLabel(member.memberType);
  const meta = isCurrentUser ? `${roleLabel} · Vos` : roleLabel;

  return (
    <ListRow
      leading={<Avatar name={member.name} size={40} isCurrentUser={isCurrentUser} />}
      title={member.name}
      meta={meta}
    />
  );
}
