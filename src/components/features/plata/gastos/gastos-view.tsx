"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PLATA_ROUTES } from "@habita/contracts";
import { openAnotar } from "@/components/features/anotar/anotar-events";
import { Receipt } from "lucide-react";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { useSnackbar } from "@/components/ds/snackbar";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { apiFetch } from "@/lib/api-client";
import { BalanceStrip } from "./balance-strip";
import { MiniBars } from "./mini-bars";
import { ExpenseDayList } from "./expense-day-list";
import { buildMonthComparisonText, formatMonthLabel } from "./gastos-logic";
import { expenseListResponseSchema } from "./expense-list-schema";

import type { ExpenseListRow } from "./expense-list-schema";
import type { PlataViewProps } from "../plata-view-props";

const PAGE_SIZE = 30;

interface BalanceTile {
  memberName: string;
  amount: number;
}

interface GastosViewProps extends PlataViewProps {
  initialExpenses: ExpenseListRow[];
  initialHasMore: boolean;
  owedToMe: BalanceTile | null;
  iOwe: BalanceTile | null;
  isSettled: boolean;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

export function GastosView({
  currentMemberId,
  currentMemberType,
  members,
  initialExpenses,
  initialHasMore,
  owedToMe,
  iOwe,
  isSettled,
}: GastosViewProps): React.JSX.Element {
  const snackbar = useSnackbar();
  const { data: insights, isLoading: insightsLoading } = useExpenseInsights();

  const [expenses, setExpenses] = useState(initialExpenses);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const raw = await apiFetch<unknown>(`/api/expenses?limit=${PAGE_SIZE}&offset=${expenses.length}`);
      const parsed = expenseListResponseSchema.parse(raw);
      setExpenses((prev) => [...prev, ...parsed.expenses]);
      setHasMore(parsed.pagination.hasMore);
    } catch {
      snackbar.show({ text: "No se pudo cargar más gastos", actionKind: "retry", onAction: handleLoadMore });
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.length]);

  const comparisonText = insights
    ? buildMonthComparisonText({
        hasReliableMonthlyTrend: insights.hasReliableMonthlyTrend,
        monthlyHistory: insights.monthlyHistory,
        projectedTotal: insights.projectedTotal,
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-3">
          {formatMonthLabel(new Date())}
        </span>
        {insightsLoading && !insights ? (
          <Skeleton className="h-14 w-40" />
        ) : (
          <span className="text-[56px] font-bold leading-[.95] tracking-[-.04em] tabular-nums text-ink">
            {formatArs(insights?.thisMonthTotal ?? 0)}
          </span>
        )}
        {insights && <MiniBars monthlyHistory={insights.monthlyHistory} />}
        {comparisonText && <span className="text-[13px] text-ink-2">{comparisonText}</span>}
      </div>

      <BalanceStrip
        owedToMe={owedToMe}
        iOwe={iOwe}
        isSettled={isSettled}
        currentMemberId={currentMemberId}
        currentMemberType={currentMemberType}
        members={members}
      />

      <button
        type="button"
        onClick={() => openAnotar({ kind: "expense" })}
        className="inline-flex h-10 w-fit items-center rounded-[12px] bg-ink px-4 text-[14px] font-semibold text-paper"
      >
        Agregar
      </button>

      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="Todavía no hay gastos" description="Anotá el primero para empezar a repartir." />
      ) : (
        <ExpenseDayList expenses={expenses} currentMemberId={currentMemberId} />
      )}

      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="self-center text-[14px] font-medium text-monte disabled:text-ink-3"
        >
          {loadingMore ? "Cargando…" : "Ver más"}
        </button>
      )}

      <div className="flex gap-5 pt-2">
        <Link href={PLATA_ROUTES.servicios} className="text-[13px] text-ink-2 underline underline-offset-[3px]">
          Servicios
        </Link>
        <Link href={PLATA_ROUTES.comoVenimos} className="text-[13px] text-ink-2 underline underline-offset-[3px]">
          Cómo venimos
        </Link>
      </div>
    </div>
  );
}
