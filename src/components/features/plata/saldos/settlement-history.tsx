"use client";

import { useMemo } from "react";
import { Button } from "@/components/ds/button";
import { Skeleton } from "@/components/ds/skeleton";
import { useSettlementHistory } from "@/hooks/use-money";
import { cn } from "@/lib/utils";
import { formatCurrencyArs, isMigratedSettlement, settlementRowLabel } from "./saldos-logic";
import { InlineError } from "../../inline-error";

interface SettlementHistoryProps {
  currentMemberId: string;
}

/** "Historial" — settlement rows newest first, paginated with "Ver más". */
export function SettlementHistory({ currentMemberId }: SettlementHistoryProps): React.JSX.Element | null {
  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useSettlementHistory();

  const settlements = useMemo(() => data?.pages.flatMap((page) => page.settlements) ?? [], [data]);

  if (isLoading) return <Skeleton className="h-12 w-full" />;
  if (isError) return <InlineError message="No pudimos cargar el historial." onRetry={() => refetch()} />;
  if (settlements.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">Historial</p>
      <div className="flex flex-col">
        {settlements.map((settlement) => {
          const migrated = isMigratedSettlement(settlement.note);
          return (
            <div
              key={settlement.id}
              className="flex items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] text-ink">
                  {settlementRowLabel(settlement, currentMemberId)}
                </p>
                <p className="truncate text-[13px] text-ink-2">
                  {new Date(settlement.settledAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </p>
                {migrated && <p className={cn("truncate text-[12px] text-ink-3")}>{settlement.note}</p>}
              </div>
              <span className="shrink-0 text-[15px] font-medium tabular-nums text-ink">
                {formatCurrencyArs(settlement.amount)}
                {settlement.currency !== "ARS" ? ` ${settlement.currency}` : ""}
              </span>
            </div>
          );
        })}
      </div>
      {hasNextPage && (
        <Button variant="secondary" size="sm" onClick={() => fetchNextPage()} loading={isFetchingNextPage} loadingLabel="Cargando">
          Ver más
        </Button>
      )}
    </div>
  );
}
