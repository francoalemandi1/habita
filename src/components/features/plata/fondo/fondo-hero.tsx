import { Button } from "@/components/ds/button";
import { ProgressBar } from "@/components/ds/progress-bar";
import { formatCurrencyArs } from "../saldos/saldos-logic";
import { monthLabelEs, quotaStatusLabel } from "./fondo-logic";

import type { FundState, MemberContributionStatus } from "@habita/contracts";

interface FondoHeroProps {
  fund: FundState;
  currentMemberStatus: MemberContributionStatus | undefined;
  onContribute: () => void;
}

/** Monte hero card + Manteca progress of this period's contributions vs total quotas. */
export function FondoHero({ fund, currentMemberStatus, onContribute }: FondoHeroProps): React.JSX.Element {
  const totalQuotas = fund.memberStatuses.reduce((sum, status) => sum + status.allocation, 0);
  const status = quotaStatusLabel(currentMemberStatus);
  const monthLabel = monthLabelEs(fund.currentPeriod);

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-monte px-5 py-5 text-paper">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-paper/80">Fondo de la casa · disponible</p>
        <p className="text-[56px] font-bold leading-[0.95] tracking-[-0.04em]">
          {formatCurrencyArs(fund.balance)}
        </p>
      </div>

      {totalQuotas > 0 && (
        <ProgressBar
          value={fund.contributedThisPeriod}
          max={totalQuotas}
          label={`${formatCurrencyArs(fund.contributedThisPeriod)} de ${formatCurrencyArs(totalQuotas)} aportados`}
          tone="onMonte"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px]">
          Tu cuota de {monthLabel} · {status}
        </p>
        <Button variant="secondary" size="sm" onClick={onContribute} className="bg-paper text-ink hover:bg-surface">
          Aportar
        </Button>
      </div>
    </div>
  );
}
