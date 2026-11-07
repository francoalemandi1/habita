import { formatCurrencyArs } from "../saldos/saldos-logic";

import type { MemberContributionStatus } from "@habita/contracts";

interface FondoQuotasListProps {
  memberStatuses: MemberContributionStatus[];
}

/** Cuotas por persona — paid vs pending this period. */
export function FondoQuotasList({ memberStatuses }: FondoQuotasListProps): React.JSX.Element | null {
  if (memberStatuses.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">Cuotas del mes</p>
      <div className="flex flex-col">
        {memberStatuses.map((status) => (
          <div
            key={status.memberId}
            className="flex items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
          >
            <span className="text-[15px] text-ink">{status.memberName}</span>
            <span className="text-[15px] font-medium tabular-nums text-ink">
              {status.pending > 0
                ? `Debe ${formatCurrencyArs(status.pending)}`
                : `Aportó ${formatCurrencyArs(status.contributed)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
