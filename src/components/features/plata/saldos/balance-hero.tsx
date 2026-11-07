import { cn } from "@/lib/utils";
import { findMemberNet, netStatus } from "./saldos-logic";

import type { ExpenseBalancesResponse } from "@habita/contracts";

interface BalanceHeroProps {
  balances: ExpenseBalancesResponse;
  currentMemberId: string;
}

/** Net balance in the primary currency, Monte if positive, Ladrillo texto if negative. */
export function BalanceHero({ balances, currentMemberId }: BalanceHeroProps): React.JSX.Element {
  const primaryNet = findMemberNet(balances.balances, currentMemberId);
  const status = netStatus(primaryNet);

  const otherCurrencies = Object.entries(balances.byCurrency).filter(
    ([currency]) => currency !== balances.primaryCurrency,
  );

  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          "text-[56px] font-bold leading-[0.95] tracking-[-0.04em] tabular-nums",
          status.sign === "positive" && "text-monte",
          status.sign === "negative" && "text-ladrillo-text",
          status.sign === "zero" && "text-ink",
        )}
      >
        {status.label}
      </p>
      {otherCurrencies.map(([currency, { balances: currencyBalances }]) => {
        const net = findMemberNet(currencyBalances, currentMemberId);
        const currencyStatus = netStatus(net);
        return (
          <p key={currency} className="text-[15px] text-ink-2">
            {currencyStatus.label} {currency}
          </p>
        );
      })}
    </div>
  );
}
