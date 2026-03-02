"use client";

import { Plus } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/expense-constants";
import { presets, statCardColors, spacing } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { formatAmount, TrendBadge } from "@/components/features/expense-shared";

import type { ExpenseInsightsResponse } from "@/lib/expense-insights";

// ============================================
// Types
// ============================================

interface ExpenseDetailedStatsProps {
  data: ExpenseInsightsResponse;
  onAddFixed?: () => void;
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
// Fixed Expenses Card (with optional CTA)
// ============================================

function FixedExpensesCard({
  data,
  onAddFixed,
  index,
}: {
  data: ExpenseInsightsResponse;
  onAddFixed?: () => void;
  index: number;
}) {
  if (data.fixedThisMonth > 0) {
    return (
      <StatCard
        label="Gastos fijos"
        value={formatAmount(data.fixedThisMonth)}
        sublabel={`${data.fixedExpensesCount} fijo${data.fixedExpensesCount !== 1 ? "s" : ""} · ${data.fixedPercentOfTotal}% del mes`}
        colorScheme={statCardColors.tan}
        index={index}
      />
    );
  }

  return (
    <div
      className={cn(presets.statCard, statCardColors.tan.bg, statCardColors.tan.text, "animate-stagger-fade-in")}
      style={{ "--stagger-index": index } as React.CSSProperties}
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
  );
}

// ============================================
// Main Component
// ============================================

export function ExpenseDetailedStats({ data, onAddFixed }: ExpenseDetailedStatsProps) {
  if (data.thisMonthTotal === 0) return null;

  if (!data.hasReliableMonthlyTrend) {
    return (
      <div className={`grid grid-cols-2 ${spacing.gridGap}`}>
        <StatCard
          label="Resumen del mes"
          value={formatAmount(data.thisMonthTotal)}
          sublabel={`${data.thisMonthExpenseCount} gasto${data.thisMonthExpenseCount !== 1 ? "s" : ""} registrado${data.thisMonthExpenseCount !== 1 ? "s" : ""}`}
          colorScheme={statCardColors.lime}
          index={1}
        />
        <FixedExpensesCard data={data} onAddFixed={onAddFixed} index={2} />
      </div>
    );
  }

  const growthCategoryLabel = data.topGrowthCategory
    ? CATEGORY_LABELS[data.topGrowthCategory.category]
    : null;

  return (
    <div className={`grid grid-cols-2 ${spacing.gridGap}`}>
      {/* Tu ritmo */}
      <StatCard
        label="Tu ritmo"
        value={`${formatAmount(data.variableDailyAverage)}/día`}
        extra={
          data.historicalDailyAverage ? (
            <div className="mt-1">
              <TrendBadge
                trend={data.dailyVsAverageTrend}
                percent={data.dailyVsAveragePercent}
              />
            </div>
          ) : undefined
        }
        colorScheme={statCardColors.lime}
        index={1}
      />

      {/* Growth or Fixed (slot 2) */}
      {data.topGrowthCategory && growthCategoryLabel ? (
        <StatCard
          label="Lo que más creció"
          value={`+${data.topGrowthCategory.growthPercent}%`}
          sublabel={`${growthCategoryLabel} vs tu promedio`}
          colorScheme={statCardColors.lavenderLight}
          index={2}
        />
      ) : (
        <FixedExpensesCard data={data} onAddFixed={onAddFixed} index={2} />
      )}

      {/* Fixed (slot 3, when growth took slot 2) */}
      {data.topGrowthCategory && growthCategoryLabel && (
        <FixedExpensesCard data={data} onAddFixed={onAddFixed} index={3} />
      )}
    </div>
  );
}
