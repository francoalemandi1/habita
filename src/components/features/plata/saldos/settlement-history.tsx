"use client";

import { Button } from "@/components/ds/button";
import { SectionCard } from "@/components/ds/section-card";
import { Skeleton } from "@/components/ds/skeleton";
import { useSettlementHistory } from "@/hooks/use-money";
import { formatCurrencyArs, settlementRowLabel } from "./saldos-logic";
import { InlineError } from "../../inline-error";

interface SettlementHistoryProps {
  currentMemberId: string;
}

const SETTLED_DATE_FORMAT = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

/** "Historial" — settlement rows newest first, paginated with "Ver más". */
export function SettlementHistory({ currentMemberId }: SettlementHistoryProps): React.JSX.Element | null {
  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useSettlementHistory();
  const settlements = data?.pages.flatMap((page) => page.settlements) ?? [];

  if (isLoading) return <Skeleton className="h-12 w-full" />;
  if (isError) return <InlineError message="No pudimos cargar el historial." onRetry={() => refetch()} />;
  if (settlements.length === 0) return null;

  return (
    <SectionCard title="Historial">
      <div className="flex flex-col">
        {settlements.map((settlement) => (
          <div
            key={settlement.id}
            className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line-soft py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] text-ink">{settlementRowLabel(settlement, currentMemberId)}</p>
              <p className="truncate text-[13px] text-ink-2">{SETTLED_DATE_FORMAT.format(new Date(settlement.settledAt))}</p>
            </div>
            <span className="shrink-0 text-[15px] font-medium text-ink">
              {formatCurrencyArs(settlement.amount)}
              {settlement.currency !== "ARS" ? ` ${settlement.currency}` : ""}
            </span>
          </div>
        ))}
      </div>
      {hasNextPage && (
        <Button variant="secondary" size="sm" onClick={() => fetchNextPage()} loading={isFetchingNextPage} loadingLabel="Cargando" className="mt-2 self-start">
          Ver más
        </Button>
      )}
    </SectionCard>
  );
}
