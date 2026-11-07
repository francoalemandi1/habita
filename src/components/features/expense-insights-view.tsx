"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, LineChart } from "lucide-react";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { InlineError } from "@/components/features/inline-error";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { buildCategoryBars, buildMonthTotalBars, COMO_VENIMOS_PERIODS } from "@/components/features/plata/como-venimos/como-venimos-logic";
import { CategoryBars } from "@/components/features/plata/como-venimos/category-bars";
import { MonthTotalBars } from "@/components/features/plata/como-venimos/month-total-bars";
import { TipCards } from "@/components/features/plata/como-venimos/tip-cards";

import type { ComoVenimosPeriod } from "@/components/features/plata/como-venimos/como-venimos-logic";

/** §5.3 "Plata" — "Cómo venimos": segmented Mes/3 meses/Año, category bars and tips. */
export function ExpenseInsightsView(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useExpenseInsights();
  const [period, setPeriod] = useState<ComoVenimosPeriod>("mes");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/plata" className="flex items-center gap-1 text-monte">
        <ChevronLeft className="size-5" strokeWidth={1.75} />
        <span className="text-[16px] font-medium">Plata</span>
      </Link>

      <h1 className="text-[22px] font-bold text-ink">Cómo venimos</h1>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-40 w-full rounded-[16px]" />
        </div>
      ) : isError ? (
        <InlineError message="No pudimos cargar cómo venimos." onRetry={() => refetch()} />
      ) : !data || data.thisMonthExpenseCount === 0 ? (
        <EmptyState icon={LineChart} title="Sin datos aún" description="Registrá gastos para ver cómo venimos este mes." />
      ) : (
        <>
          <SegmentedControl options={COMO_VENIMOS_PERIODS} value={period} onChange={setPeriod} />

          {period === "mes" ? (
            <CategoryBars bars={buildCategoryBars(data.categoryBreakdown, data.topGrowthCategory?.category ?? null)} />
          ) : (
            <MonthTotalBars bars={buildMonthTotalBars(data.monthlyHistory, period)} />
          )}

          <TipCards tips={data.spendingTips} />
        </>
      )}
    </div>
  );
}
