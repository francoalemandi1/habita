"use client";

import { BarChart3, TrendingUp, TrendingDown, Minus, AlertCircle, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { formatAmount } from "@/components/features/expense-shared";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/expense-constants";
import { spacing, typography, iconSize } from "@/lib/design-tokens";

import type { ExpenseCategory } from "@prisma/client";
import type { MonthStatus, SpendingTip } from "@/lib/expense-insights";

function statusLabel(status: MonthStatus): string {
  switch (status) {
    case "well_below": return "Muy por debajo del promedio";
    case "above_average": return "Por arriba del promedio";
    case "stable": return "Mes estable";
  }
}

function statusColor(status: MonthStatus): { text: string; bg: string; border: string } {
  switch (status) {
    case "well_below":
      return { text: "text-green-700 dark:text-green-300", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-900" };
    case "above_average":
      return { text: "text-red-700 dark:text-red-300", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900" };
    case "stable":
      return { text: "text-foreground", bg: "bg-muted/30", border: "border" };
  }
}

function trendIcon(trend: "up" | "down" | "flat") {
  switch (trend) {
    case "up": return <TrendingUp className="h-4 w-4 text-red-500" />;
    case "down": return <TrendingDown className="h-4 w-4 text-green-500" />;
    case "flat": return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function tipBgColor(severity: SpendingTip["severity"]): string {
  switch (severity) {
    case "critica": return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900";
    case "alerta": return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900";
    case "info": return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900";
  }
}

export function ExpenseInsightsView() {
  const { data, isLoading } = useExpenseInsights({});

  if (isLoading) {
    return (
      <>
        <div className={spacing.pageHeader}>
          <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
            <BarChart3 className={`${iconSize.lg} text-primary shrink-0`} />
            Análisis de Gastos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Cómo estás este mes.</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!data || data.thisMonthExpenseCount === 0) {
    return (
      <>
        <div className={spacing.pageHeader}>
          <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
            <BarChart3 className={`${iconSize.lg} text-primary shrink-0`} />
            Análisis de Gastos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Cómo estás este mes.</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 px-6 py-16 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-semibold">Sin datos aún</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Registrá gastos para ver un análisis de tus finanzas del mes.
          </p>
        </div>
      </>
    );
  }

  const sc = statusColor(data.monthStatus);

  return (
    <>
      <div className={spacing.pageHeader}>
        <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
          <BarChart3 className={`${iconSize.lg} text-primary shrink-0`} />
          Análisis de Gastos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Cómo estás este mes.</p>
      </div>

      {/* Month status */}
      <div className={cn("mb-4 rounded-xl border p-4", sc.bg, sc.border)}>
        <p className={cn("text-lg font-semibold", sc.text)}>{statusLabel(data.monthStatus)}</p>
        {data.hasReliableMonthlyTrend && data.variableMonthlyAverage != null && (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            {trendIcon(data.variableVsAverageTrend)}
            <span>
              {data.variableVsAverageTrend === "flat"
                ? "En línea con tu promedio"
                : `${data.variableVsAveragePercent}% ${data.variableVsAverageTrend === "up" ? "más" : "menos"} que tu promedio`}
            </span>
          </div>
        )}
      </div>

      {/* Monthly totals */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total del mes</p>
          <p className="mt-1 text-2xl font-bold">{formatAmount(data.thisMonthTotal)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Día {data.daysElapsedThisMonth} de {data.totalDaysInMonth}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Proyectado</p>
          <p className="mt-1 text-2xl font-bold">{formatAmount(data.projectedTotal)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fijos: {formatAmount(data.fixedThisMonth)} · Variable: {formatAmount(data.variableThisMonth)}
          </p>
        </div>
      </div>

      {/* Upcoming services */}
      {data.upcomingServicesCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <Calendar className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {data.upcomingServicesCount} servicio{data.upcomingServicesCount !== 1 ? "s" : ""} esta semana ({formatAmount(data.upcomingServicesCost)})
          </p>
        </div>
      )}

      {/* Spending tips */}
      {data.spendingTips.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Consejos</p>
          {data.spendingTips.map((tip) => (
            <div key={tip.id} className={cn("rounded-xl border p-3", tipBgColor(tip.severity))}>
              <p className="text-sm">
                <span className="mr-1.5">{tip.emoji}</span>
                {tip.message}
              </p>
              {tip.action && (
                <a
                  href={tip.action.href}
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  {tip.action.label} →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Categorías (variable)
          </p>
          <div className="space-y-2">
            {data.categoryBreakdown.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.category];
              const label = CATEGORY_LABELS[cat.category] ?? cat.category;
              return (
                <div key={cat.category} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm">{label}</span>
                  </div>
                  <span className="text-sm font-medium">{formatAmount(cat.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
