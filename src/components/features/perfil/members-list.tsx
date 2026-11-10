import { Avatar } from "@/components/ds/avatar";
import { ListRow } from "@/components/ds/list-row";
import { MEMBER_TYPE_LABELS } from "@/lib/perfil-logic";

import type { MemberType } from "@prisma/client";

export interface HouseholdMemberItem {
  id: string;
  name: string;
  memberType: MemberType;
}

export interface MembersListProps {
  members: HouseholdMemberItem[];
  currentMemberId: string;
  /** Extra rows at the end of the same card, e.g. the invite row. */
  footer?: React.ReactNode;
}

/** §5.3 Perfil — "Integrantes" list with role label and a "Vos" tag on the current member. */
export function MembersList({ members, currentMemberId, footer }: MembersListProps): React.JSX.Element {
  return (
    <div className="rounded-[20px] bg-surface px-2">
      {members.map((member) => {
        const isSelf = member.id === currentMemberId;
        const roleLabel = MEMBER_TYPE_LABELS[member.memberType];
        return (
          <ListRow
            key={member.id}
            leadingAvatar={<Avatar name={member.name} size={40} isSelf={isSelf} ringBackground="var(--color-surface)" />}
            title={member.name}
            meta={isSelf ? `${roleLabel} · Vos` : roleLabel}
          />
        );
      })}
      {footer}
    </div>
  );
}
