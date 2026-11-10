import { cn } from "@/lib/utils";
import { findMemberNet, netStatus } from "./saldos-logic";

import type { ExpenseBalancesResponse } from "@habita/contracts";

interface BalanceHeroProps {
  balances: ExpenseBalancesResponse;
  currentMemberId: string;
}

const HERO_CAPTIONS = {
  positive: "Es lo que te deben, sumando todo lo de la casa.",
  negative: "Es lo que debés, sumando todo lo de la casa.",
  zero: "Nadie te debe y no le debés a nadie.",
} as const;

/** Net balance in the primary currency, Monte if positive, Ladrillo texto if negative. */
export function BalanceHero({ balances, currentMemberId }: BalanceHeroProps): React.JSX.Element {
  const primaryNet = findMemberNet(balances.balances, currentMemberId);
  const status = netStatus(primaryNet);

  const otherCurrencies = Object.entries(balances.byCurrency).filter(
    ([currency]) => currency !== balances.primaryCurrency,
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">Tu saldo</span>
      <p
        className={cn(
          "text-[56px] font-bold leading-[0.95] tracking-[-0.04em]",
          status.sign === "positive" && "text-monte",
          status.sign === "negative" && "text-ladrillo-text",
          status.sign === "zero" && "text-ink",
        )}
      >
        {status.label}
      </p>
      <p className="text-[14px] text-ink-2">{HERO_CAPTIONS[status.sign]}</p>
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
