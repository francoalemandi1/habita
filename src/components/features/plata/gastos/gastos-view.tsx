"use client";

import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { openAnotar } from "@/components/features/anotar/anotar-events";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { useSnackbar } from "@/components/ds/snackbar";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { Button } from "@/components/ds/button";
import { apiFetch } from "@/lib/api-client";
import { BalanceStrip } from "./balance-strip";
import { MiniBars } from "./mini-bars";
import { ExpenseDayList } from "./expense-day-list";
import { buildMonthComparisonText, formatMonthLabel } from "./gastos-logic";
import { expenseListResponseSchema } from "./expense-list-schema";

import type { ExpenseInsightsResponse } from "@/lib/expense-insights";
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
  initialInsights: ExpenseInsightsResponse;
  owedToMe: BalanceTile | null;
  iOwe: BalanceTile | null;
  isSettled: boolean;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Plata → Gastos (§5.3): month hero with 6-month bars, balances + Liquidar, day-grouped list. */
export function GastosView({
  currentMemberId,
  currentMemberType,
  members,
  initialExpenses,
  initialHasMore,
  initialInsights,
  owedToMe,
  iOwe,
  isSettled,
}: GastosViewProps): React.JSX.Element {
  const snackbar = useSnackbar();
  const { data: insights, isLoading: insightsLoading } = useExpenseInsights(initialInsights);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  async function loadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const raw = await apiFetch<unknown>(`/api/expenses?limit=${PAGE_SIZE}&offset=${expenses.length}`);
      const parsed = expenseListResponseSchema.parse(raw);
      setExpenses((previous) => [...previous, ...parsed.expenses]);
      setHasMore(parsed.pagination.hasMore);
    } catch (error) {
      console.error("[gastos] load more failed:", error);
      snackbar.show({ text: "No se pudieron cargar más gastos", tone: "error", actionKind: "retry", onAction: () => void loadMore() });
    } finally {
      setIsLoadingMore(false);
    }
  }

  const comparisonText = insights
    ? buildMonthComparisonText({
        hasReliableMonthlyTrend: insights.hasReliableMonthlyTrend,
        monthlyHistory: insights.monthlyHistory,
        projectedTotal: insights.projectedTotal,
      })
    : null;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <section aria-label="Gastos del mes" className="flex items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">
            {formatMonthLabel(new Date())}
          </span>
          {insightsLoading && !insights ? (
            <Skeleton className="h-[53px] w-48" />
          ) : (
            <span className="text-[44px] font-bold leading-[.95] tracking-[-.04em] text-ink md:text-[56px]">
              {formatArs(insights?.thisMonthTotal ?? 0)}
            </span>
          )}
          {comparisonText && <span className="text-[13px] text-ink-2">{comparisonText}</span>}
        </div>
        {insights && <MiniBars monthlyHistory={insights.monthlyHistory} />}
      </section>

      <BalanceStrip
        owedToMe={owedToMe}
        iOwe={iOwe}
        isSettled={isSettled}
        currentMemberId={currentMemberId}
        currentMemberType={currentMemberType}
        members={members}
      />

      <section aria-label="Gastos" className="rounded-[20px] bg-surface px-4 pb-2 pt-4 md:px-5">
        <div className="flex items-center justify-between gap-3 pb-2">
          <h2 className="text-[17px] font-semibold text-ink">Gastos</h2>
          <Button variant="secondary" size="sm" onClick={() => openAnotar({ kind: "expense" })}>
            <Plus aria-hidden="true" />
            Anotar gasto
          </Button>
        </div>
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Todavía no hay gastos"
            description="Anotá el primero y Habita calcula quién le debe a quién."
            className="py-10"
          />
        ) : (
          <ExpenseDayList expenses={expenses} currentMemberId={currentMemberId} />
        )}
        {hasMore && (
          <div className="flex justify-center border-t border-line-soft py-2">
            <Button variant="link" size="sm" loading={isLoadingMore} loadingLabel="Cargando" onClick={() => void loadMore()}>
              Ver más
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
