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
      <div>
        <p className="text-[13px] opacity-80">Fondo de la casa</p>
        <p className="text-[56px] font-bold leading-[0.95] tracking-[-0.04em] tabular-nums">
          {formatCurrencyArs(fund.balance)}
        </p>
      </div>

      {totalQuotas > 0 && (
        <ProgressBar
          value={fund.contributedThisPeriod}
          max={totalQuotas}
          label={`${formatCurrencyArs(fund.contributedThisPeriod)} de ${formatCurrencyArs(totalQuotas)} aportados`}
          className="[&_p]:text-paper/80 [&>div]:bg-paper/20 [&>div>div]:bg-manteca"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px]">
          Tu cuota de {monthLabel} · {status}
        </p>
        <Button variant="secondary" size="sm" onClick={onContribute}>
          Aportar
        </Button>
      </div>
    </div>
  );
}
