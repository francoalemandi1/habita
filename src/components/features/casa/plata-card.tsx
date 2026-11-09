import Link from "next/link";
import { Check } from "lucide-react";
import { APP_ROUTES } from "@habita/contracts";
import { buttonVariants } from "@/components/ds/lib/button-variants";
import { cn } from "@/lib/utils";
import { formatArs } from "./casa-logic";

interface BalanceTile {
  memberName: string;
  amount: number;
}

interface PlataCardProps {
  monthLabel: string;
  monthTotal: number;
  owedToMe: BalanceTile | null;
  iOwe: BalanceTile | null;
  isSettled: boolean;
}

/** Casa board, Plata card (§5.3 Casa): month total, who owes whom, Liquidar. */
export function PlataCard({ monthLabel, monthTotal, owedToMe, iOwe, isSettled }: PlataCardProps): React.JSX.Element {
  return (
    <section aria-labelledby="casa-plata" className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 md:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="casa-plata" className="text-[24px] font-bold leading-none tracking-[-.03em] text-ink md:text-[28px]">
          <Link href={APP_ROUTES.plata} className="hover:text-monte">
            Plata
          </Link>
        </h2>
        <span className="text-[13px] text-ink-2">{monthLabel}</span>
      </div>

      <p className="text-[44px] font-bold leading-[.95] tracking-[-.04em] text-ink">
        {formatArs(monthTotal)}
        <span className="sr-only"> gastados en {monthLabel.toLowerCase()}</span>
      </p>

      {isSettled ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-monte-soft px-3 py-1.5 text-[13px] font-medium text-monte">
          <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />
          Están al día
        </span>
      ) : (
        <div className="flex flex-wrap items-stretch gap-2.5">
          {owedToMe && <Tile label={`${owedToMe.memberName} te debe`} amount={owedToMe.amount} tone="positive" />}
          {iOwe && <Tile label={`Le debés a ${iOwe.memberName}`} amount={iOwe.amount} tone="negative" />}
          <Link
            href={`${APP_ROUTES.plata}?v=saldos`}
            className={cn(buttonVariants({ variant: "primary" }), "h-auto min-h-12 flex-none self-stretch")}
          >
            Liquidar
          </Link>
        </div>
      )}
    </section>
  );
}

function Tile({ label, amount, tone }: { label: string; amount: number; tone: "positive" | "negative" }) {
  return (
    <div className="flex min-w-[120px] flex-1 flex-col gap-0.5 rounded-[14px] bg-paper px-3.5 py-3">
      <span className="truncate text-[12px] text-ink-2">{label}</span>
      <span className={cn("text-[20px] font-semibold tracking-[-.02em]", tone === "positive" ? "text-monte" : "text-ladrillo-text")}>
        {formatArs(amount)}
      </span>
    </div>
  );
}
