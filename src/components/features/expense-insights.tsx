"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Loader2,
  Check,
  AlertTriangle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/expense-constants";
import { presets, statCardColors, spacing, iconSize } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

import type { ExpenseInsightsResponse, FrequentExpense, SpendingTip } from "@/lib/expense-insights";
import type { MonthStatus } from "@/lib/expense-insights";
import type { LucideIcon } from "lucide-react";

// ============================================
// Types
// ============================================

interface ExpenseInsightsProps {
  /** Increment to trigger a re-fetch (e.g. after expense mutations). */
  refreshKey?: number;
  /** Callback to open the "add fixed expense/service" flow. */
  onAddFixed?: () => void;
  /** Reports frequent expenses when data is loaded (for rendering pills elsewhere). */
  onFrequentExpensesLoaded?: (expenses: FrequentExpense[]) => void;
}

// ============================================
// Helpers
// ============================================

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  }
  if (amount >= 10_000) {
    return `$${Math.round(amount / 1_000).toLocaleString("es-AR")}k`;
  }
  return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================
// Trend Badge
// ============================================

function TrendBadge({
  trend,
  percent,
  comparisonLabel = "vs tu promedio",
}: {
  trend: "up" | "down" | "flat";
  percent: number;
  comparisonLabel?: string;
}) {
  if (trend === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs opacity-70">
        <Minus className="h-3 w-3" />
        similar a tu promedio
      </span>
    );
  }

  const isUp = trend === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isUp ? "text-red-600" : "text-green-600",
      )}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : "-"}{percent}% {comparisonLabel}
    </span>
  );
}

// ============================================
// Stat Card (reusable)
// ============================================

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  extra?: React.ReactNode;
  colorScheme: { bg: string; text: string };
  index: number;
}

function StatCard({ label, value, sublabel, extra, colorScheme, index }: StatCardProps) {
  return (
    <div
      className={cn(presets.statCard, colorScheme.bg, colorScheme.text, "animate-stagger-fade-in")}
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {extra}
      {sublabel && <p className="mt-0.5 text-xs opacity-70">{sublabel}</p>}
    </div>
  );
}

// ============================================
// Hero Status Card (Card 1 — Estado del mes)
// ============================================

const STATUS_CONFIG: Record<MonthStatus, {
  icon: LucideIcon;
  iconColor: string;
  bg: string;
  darkBg: string;
  headline: string;
}> = {
  stable: {
    icon: Check,
    iconColor: "text-green-600",
    bg: "bg-green-50",
    darkBg: "dark:bg-green-950",
    headline: "Dentro de tu promedio",
  },
  well_below: {
    icon: Check,
    iconColor: "text-green-600",
    bg: "bg-green-50",
    darkBg: "dark:bg-green-950",
    headline: "Vas muy bien este mes",
  },
  above_average: {
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    bg: "bg-amber-50",
    darkBg: "dark:bg-amber-950",
    headline: "Estás gastando más de lo habitual",
  },
};

function HeroStatusCard({
  monthStatus,
  thisMonthTotal,
  projectedTotal,
  variableVsAveragePercent,
  variableVsAverageTrend,
  variableMonthlyAverage,
}: {
  monthStatus: MonthStatus;
  thisMonthTotal: number;
  projectedTotal: number;
  variableVsAveragePercent: number;
  variableVsAverageTrend: "up" | "down" | "flat";
  variableMonthlyAverage: number | null;
}) {
  const config = STATUS_CONFIG[monthStatus];
  const StatusIcon = config.icon;
  const hasHistory = variableMonthlyAverage !== null;

  return (
    <div className={cn("rounded-2xl px-5 py-4 animate-fade-in", config.bg, config.darkBg)}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Cómo venís este mes
      </p>

      <div className="mt-2 flex items-center gap-2">
        <StatusIcon className={cn("h-5 w-5 shrink-0", config.iconColor)} />
        <p className="text-base font-semibold text-foreground">{config.headline}</p>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">
          {formatAmount(thisMonthTotal)}
        </span>
        <span className="text-sm text-muted-foreground">gastados</span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Camino a {formatAmount(projectedTotal)}
      </p>

      {hasHistory && variableVsAverageTrend !== "flat" && (
        <div className="mt-2">
          <TrendBadge
            trend={variableVsAverageTrend}
            percent={variableVsAveragePercent}
            comparisonLabel="vs tu promedio"
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Spending Tips (feature cross-links)
// ============================================

function SpendingTips({ tips }: { tips: SpendingTip[] }) {
  if (tips.length === 0) return null;

  return (
    <div className="space-y-2">
      {tips.map((tip) => (
        <div
          key={tip.id}
          className="flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-3"
        >
          <span className="mt-0.5 shrink-0 text-base leading-none">{tip.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground/90">{tip.message}</p>
            {tip.action && (
              <Link
                href={tip.action.href}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {tip.action.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Quick Add Pills
// ============================================

export function QuickAddPills({
  expenses,
  onQuickAdd,
}: {
  expenses: FrequentExpense[];
  onQuickAdd: (preset: FrequentExpense) => void;
}) {
  if (expenses.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <span className="shrink-0 text-xs text-muted-foreground">Rápido:</span>
      {expenses.map((expense) => {
        const Icon = CATEGORY_ICONS[expense.category];
        return (
          <button
            key={expense.title}
            type="button"
            onClick={() => onQuickAdd(expense)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted active:bg-muted/80"
          >
            <Icon className="h-3 w-3" />
            {expense.title} {formatAmount(expense.amount)}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ExpenseInsights({ refreshKey, onAddFixed, onFrequentExpensesLoaded }: ExpenseInsightsProps) {
  const [data, setData] = useState<ExpenseInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/expenses/insights");
      if (!response.ok) return;
      const result = (await response.json()) as ExpenseInsightsResponse;
      setData(result);
      onFrequentExpensesLoaded?.(result.frequentExpenses);
    } catch {
      // Silently skip — insights are non-critical
    } finally {
      setIsLoading(false);
    }
  }, [onFrequentExpensesLoaded]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className={`${iconSize.lg} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  if (!data || data.thisMonthTotal === 0) return null;

  const growthCategoryLabel = data.topGrowthCategory
    ? CATEGORY_LABELS[data.topGrowthCategory.category]
    : null;

  return (
    <div className="space-y-4">
      {/* Card grid */}
      <div className={`grid grid-cols-2 ${spacing.gridGap}`}>
        {/* Hero — full width */}
        <div className="col-span-2">
          <HeroStatusCard
            monthStatus={data.monthStatus}
            thisMonthTotal={data.thisMonthTotal}
            projectedTotal={data.projectedTotal}
            variableVsAveragePercent={data.variableVsAveragePercent}
            variableVsAverageTrend={data.variableVsAverageTrend}
            variableMonthlyAverage={data.variableMonthlyAverage}
          />
        </div>

        {/* Row 2: Ritmo + Growth insight / Fijos */}
        <StatCard
          label="Tu ritmo"
          value={`${formatAmount(data.variableDailyAverage)}/día`}
          extra={
            data.historicalDailyAverage ? (
              <div className="mt-1">
                <TrendBadge
                  trend={data.dailyVsAverageTrend}
                  percent={data.dailyVsAveragePercent}
                  comparisonLabel="vs tu promedio"
                />
              </div>
            ) : undefined
          }
          colorScheme={statCardColors.lime}
          index={1}
        />

        {data.topGrowthCategory && growthCategoryLabel ? (
          <StatCard
            label="Lo que más creció"
            value={`+${data.topGrowthCategory.growthPercent}%`}
            sublabel={`${growthCategoryLabel} vs tu promedio`}
            colorScheme={statCardColors.lavenderLight}
            index={2}
          />
        ) : data.fixedThisMonth > 0 ? (
          <StatCard
            label="Gastos fijos"
            value={formatAmount(data.fixedThisMonth)}
            sublabel={`${data.fixedExpensesCount} fijo${data.fixedExpensesCount !== 1 ? "s" : ""} · ${data.fixedPercentOfTotal}% del mes`}
            colorScheme={statCardColors.tan}
            index={2}
          />
        ) : (
          <div
            className={cn(presets.statCard, statCardColors.tan.bg, statCardColors.tan.text, "animate-stagger-fade-in")}
            style={{ "--stagger-index": 2 } as React.CSSProperties}
          >
            <p className="text-xs font-medium opacity-80">Gastos fijos</p>
            <p className="mt-1 text-xl font-bold">—</p>
            <p className="mt-0.5 text-xs opacity-70">No registraste fijos</p>
            {onAddFixed && (
              <button
                type="button"
                onClick={onAddFixed}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-foreground/20"
              >
                <Plus className="h-3 w-3" />
                Agregar fijo
              </button>
            )}
          </div>
        )}

        {/* Row 3: Fijos card when growth took slot above */}
        {data.topGrowthCategory && growthCategoryLabel && (
          data.fixedThisMonth > 0 ? (
            <StatCard
              label="Gastos fijos"
              value={formatAmount(data.fixedThisMonth)}
              sublabel={`${data.fixedExpensesCount} fijo${data.fixedExpensesCount !== 1 ? "s" : ""} · ${data.fixedPercentOfTotal}% del mes`}
              colorScheme={statCardColors.tan}
              index={3}
            />
          ) : (
            <div
              className={cn(presets.statCard, statCardColors.tan.bg, statCardColors.tan.text, "animate-stagger-fade-in")}
              style={{ "--stagger-index": 3 } as React.CSSProperties}
            >
              <p className="text-xs font-medium opacity-80">Gastos fijos</p>
              <p className="mt-1 text-xl font-bold">—</p>
              <p className="mt-0.5 text-xs opacity-70">No registraste fijos</p>
              {onAddFixed && (
                <button
                  type="button"
                  onClick={onAddFixed}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-foreground/20"
                >
                  <Plus className="h-3 w-3" />
                  Agregar fijo
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* Feature cross-link banners */}
      <SpendingTips tips={data.spendingTips} />

      {/* Upcoming services notice */}
      {data.upcomingServicesCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950">
          <Zap className={`${iconSize.sm} mt-0.5 shrink-0 text-amber-500`} />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Tenés {data.upcomingServicesCount} servicio{data.upcomingServicesCount !== 1 ? "s" : ""} que vence{data.upcomingServicesCount !== 1 ? "n" : ""} pronto (~{formatAmount(data.upcomingServicesCost)})
          </p>
        </div>
      )}
    </div>
  );
}
