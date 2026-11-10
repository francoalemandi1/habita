import { Avatar } from "@/components/ds/avatar";
import { SectionCard } from "@/components/ds/section-card";
import { cn } from "@/lib/utils";
import { formatCurrencyArs } from "../saldos/saldos-logic";

import type { MemberContributionStatus } from "@habita/contracts";

interface FondoQuotasListProps {
  memberStatuses: MemberContributionStatus[];
  currentMemberId: string;
}

/** Cuotas por persona — paid vs still to contribute this period (no guilt copy, §10). */
export function FondoQuotasList({ memberStatuses, currentMemberId }: FondoQuotasListProps): React.JSX.Element | null {
  if (memberStatuses.length === 0) return null;

  return (
    <SectionCard title="Cuotas del mes">
      <ul className="flex flex-col">
        {memberStatuses.map((status) => {
          const isSelf = status.memberId === currentMemberId;
          const isPending = status.pending > 0;
          return (
            <li key={status.memberId} className="flex min-h-[52px] items-center gap-3 border-b border-line-soft py-2 last:border-b-0">
              <Avatar name={status.memberName} size={28} isSelf={isSelf} ringBackground="var(--color-surface)" />
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{isSelf ? "Vos" : status.memberName}</span>
              <span className={cn("shrink-0 text-[14px] font-medium", isPending ? "text-ink-2" : "text-monte")}>
                {isPending ? `Falta ${formatCurrencyArs(status.pending)}` : `Aportó ${formatCurrencyArs(status.contributed)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
