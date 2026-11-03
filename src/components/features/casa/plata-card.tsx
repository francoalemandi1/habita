import Link from "next/link";
import { APP_ROUTES } from "@habita/contracts";
import { formatArs } from "./casa-logic";

interface PlataCardProps {
  monthLabel: string;
  monthTotal: number;
  owedToMe: { memberName: string; amount: number } | null;
  iOwe: { memberName: string; amount: number } | null;
  isSettled: boolean;
}

/** Casa board, Plata card (handoff §5.3 "Casa"). */
export function PlataCard({ monthLabel, monthTotal, owedToMe, iOwe, isSettled }: PlataCardProps): React.JSX.Element {
  return (
    <Link href={APP_ROUTES.plata} className="flex flex-col gap-4 rounded-[20px] bg-surface p-7">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[30px] font-bold leading-none tracking-[-.03em] text-ink">Plata</h2>
        <span className="text-[14px] text-ink-2">{monthLabel}</span>
      </div>
      <span className="text-[44px] font-bold leading-[.95] tracking-[-.03em] text-ink">{formatArs(monthTotal)}</span>

      {isSettled ? (
        <span className="text-[14px] text-ink-2">Están al día</span>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {owedToMe && (
            <div className="flex flex-col gap-0.5 rounded-[14px] bg-paper px-3.5 py-3">
              <span className="text-[12px] text-ink-2">{owedToMe.memberName} te debe</span>
              <span className="text-[18px] font-medium tabular-nums text-monte">{formatArs(owedToMe.amount)}</span>
            </div>
          )}
          {iOwe && (
            <div className="flex flex-col gap-0.5 rounded-[14px] bg-paper px-3.5 py-3">
              <span className="text-[12px] text-ink-2">Le debés a {iOwe.memberName}</span>
              <span className="text-[18px] font-medium tabular-nums text-ladrillo-text">{formatArs(iOwe.amount)}</span>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
