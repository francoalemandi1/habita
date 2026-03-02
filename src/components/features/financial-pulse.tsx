"use client";

import Link from "next/link";
import {
  Check,
  AlertTriangle,
  Receipt,
  Zap,
  ArrowRight,
  Loader2,
  BarChart3,
  Info,
} from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_BAR_COLORS } from "@/lib/expense-constants";
import { iconSize } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { formatAmount, TrendBadge } from "@/components/features/expense-shared";

import type { ExpenseInsightsResponse, SpendingTip, CategoryAmount, MonthStatus } from "@/lib/expense-insights";

// ============================================
// Types
// ============================================

interface FinancialPulseProps {
  data: ExpenseInsightsResponse | null;
  isLoading: boolean;
}

// ============================================
// Hero state resolution
// ============================================

type HeroState = "no_data_ever" | "no_this_month" | "few_expenses" | "no_history" | "full";
const SHOW_CATEGORY_BREAKDOWN = false;

function resolveHeroState(data: ExpenseInsightsResponse): HeroState {
  if (!data.hasAnyHistoricalExpenses) return "no_data_ever";
  if (data.thisMonthExpenseCount === 0) return "no_this_month";
  if (!data.hasReliableMonthlyTrend) return "few_expenses";
  if (data.variableMonthlyAverage === null) return "no_history";
  return "full";
}

// ============================================
// Hero Status Config
// ============================================

const STATUS_CONFIG: Record<MonthStatus, {
  iconColor: string;
  bg: string;
  darkBg: string;
  headline: string;
}> = {
  stable: {
    iconColor: "text-green-600",
    bg: "bg-green-50",
    darkBg: "dark:bg-green-950",
    headline: "Dentro de tu promedio",
  },
  well_below: {
    iconColor: "text-green-600",
    bg: "bg-green-50",
    darkBg: "dark:bg-green-950",
    headline: "Vas muy bien este mes",
  },
  above_average: {
    iconColor: "text-amber-600",
    bg: "bg-amber-50",
    darkBg: "dark:bg-amber-950",
    headline: "Estás gastando más de lo habitual",
  },
};

// ============================================
// Contextual Hero
// ============================================

function ContextualHero({ data }: { data: ExpenseInsightsResponse }) {
  const heroState = resolveHeroState(data);

  if (heroState === "no_data_ever") {
    return (
      <div className="rounded-2xl bg-muted/40 px-5 py-6 text-center animate-fade-in dark:bg-muted/20">
        <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Registrá tu primer gasto para ver cómo venís
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Analizamos tus gastos y te ayudamos a entender tu economía
        </p>
      </div>
    );
  }

  if (heroState === "no_this_month") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 animate-fade-in dark:border-amber-900 dark:bg-amber-950/40">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Este mes aún no registraste gastos
            </p>
            <p className="mt-0.5 text-xs text-amber-800/85 dark:text-amber-300/85">
              No pasa nada: tu historial sigue disponible para comparar tendencias.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (heroState === "few_expenses") {
    return (
      <div className="rounded-2xl bg-muted/40 px-5 py-4 animate-fade-in dark:bg-muted/20">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Cómo venís este mes
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">
            {formatAmount(data.thisMonthTotal)}
          </span>
          <span className="text-sm text-muted-foreground">gastados</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Con más datos podemos mostrarte tendencias y comparativas
        </p>
      </div>
    );
  }

  // no_history or full — same visual, but full has trend badge
  const config = STATUS_CONFIG[data.monthStatus];

  return (
    <div className={cn("rounded-2xl px-5 py-4 animate-fade-in", config.bg, config.darkBg)}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Cómo venís este mes
      </p>

      {heroState === "full" && (
        <div className="mt-2 flex items-center gap-2">
          {data.monthStatus === "above_average" ? (
            <AlertTriangle className={cn("h-5 w-5 shrink-0", config.iconColor)} />
          ) : (
            <Check className={cn("h-5 w-5 shrink-0", config.iconColor)} />
          )}
          <p className="text-base font-semibold text-foreground">{config.headline}</p>
        </div>
      )}

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">
          {formatAmount(data.thisMonthTotal)}
        </span>
        <span className="text-sm text-muted-foreground">gastados</span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Camino a {formatAmount(data.projectedTotal)}
      </p>

      {heroState === "full" && data.variableVsAverageTrend !== "flat" && (
        <div className="mt-2">
          <TrendBadge
            trend={data.variableVsAverageTrend}
            percent={data.variableVsAveragePercent}
          />
        </div>
      )}
    </div>
  );
}

function formatMonthLabel(month: string): string {
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return month;
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString("es-AR", { month: "short" });
}

function MonthlyHistoryChart({ data }: { data: ExpenseInsightsResponse["monthlyHistory"] }) {
  if (data.length === 0) return null;
  const hasAnyValues = data.some((item) => item.total > 0);
  if (!hasAnyValues) {
    return (
      <div className="rounded-2xl border border-dashed border-muted-foreground/30 px-4 py-5 text-center">
        <p className="text-sm text-muted-foreground">
          Aún no hay datos suficientes para graficar el historial mensual.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((item) => item.total), 1);

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Historial mensual
      </p>
      <div className="rounded-2xl border border-border/40 bg-muted/20 px-3 py-3">
        <div className="flex h-32 items-end justify-between gap-2">
          {data.map((item) => {
            const totalHeight = Math.max((item.total / maxTotal) * 100, item.total > 0 ? 8 : 2);
            const fixedRatio = item.total > 0 ? (item.fixed / item.total) * 100 : 0;
            const variableRatio = Math.max(0, 100 - fixedRatio);

            return (
              <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-t-md bg-muted"
                  style={{ height: `${totalHeight}%` }}
                >
                  <div
                    className="w-full rounded-t-md bg-amber-500/75 transition-all duration-300"
                    style={{ height: `${fixedRatio}%` }}
                    title={`Fijos ${formatAmount(item.fixed)}`}
                  />
                  <div
                    className="w-full bg-primary/80 transition-all duration-300"
                    style={{ height: `${variableRatio}%` }}
                    title={`Variables ${formatAmount(item.variable)}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-foreground/80">
                  {item.total > 0 ? formatAmount(item.total) : "—"}
                </span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {formatMonthLabel(item.month)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary/80" />
            Variables
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500/75" />
            Fijos
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Category Breakdown Mini
// ============================================

const TOP_CATEGORIES_COUNT = 3;

function CategoryBreakdownMini({
  breakdown,
  variableTotal,
}: {
  breakdown: CategoryAmount[];
  variableTotal: number;
}) {
  if (breakdown.length === 0 || variableTotal === 0) return null;

  const topCategories = breakdown.slice(0, TOP_CATEGORIES_COUNT);
  const remainingCount = Math.max(0, breakdown.length - TOP_CATEGORIES_COUNT);
  const maxAmount = topCategories[0]?.amount ?? 0;

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        En qué gastás
      </p>
      <div className="space-y-2">
        {topCategories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.category];
          const barColor = CATEGORY_BAR_COLORS[cat.category];
          const percent = Math.round((cat.amount / variableTotal) * 100);
          const barWidth = maxAmount > 0 ? Math.round((cat.amount / maxAmount) * 100) : 0;

          return (
            <div key={cat.category} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="w-24 shrink-0 truncate text-xs text-foreground">
                {CATEGORY_LABELS[cat.category]}
              </span>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full transition-all duration-500", barColor)}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                {percent}%
              </span>
              <span className="w-14 shrink-0 text-right text-xs font-medium text-foreground">
                {formatAmount(cat.amount)}
              </span>
            </div>
          );
        })}
      </div>
      {remainingCount > 0 && (
        <p className="pl-6 text-xs text-muted-foreground">
          +{remainingCount} más
        </p>
      )}
    </div>
  );
}

// ============================================
// Spending Tips
// ============================================

function SpendingTips({ tips }: { tips: SpendingTip[] }) {
  if (tips.length === 0) return null;

  const severityStyles: Record<SpendingTip["severity"], { card: string; label: string }> = {
    info: {
      card: "border-border/40 bg-muted/30",
      label: "text-muted-foreground",
    },
    alerta: {
      card: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
      label: "text-amber-800 dark:text-amber-300",
    },
    critica: {
      card: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
      label: "text-red-800 dark:text-red-300",
    },
  };

  return (
    <div className="space-y-2">
      {tips.map((tip) => {
        const style = severityStyles[tip.severity];
        return (
          <div
            key={tip.id}
            className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", style.card)}
          >
            <span className="mt-0.5 shrink-0 text-base leading-none">{tip.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className={cn("mb-1 text-[11px] font-semibold uppercase tracking-wide", style.label)}>
                {tip.severity === "critica" ? "Critica" : tip.severity === "alerta" ? "Alerta" : "Info"}
              </p>
              <p className="text-sm text-foreground">{tip.message}</p>
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
        );
      })}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function FinancialPulse({ data, isLoading }: FinancialPulseProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className={`${iconSize.lg} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  if (!data) return null;

  const hasExpenses = data.thisMonthExpenseCount > 0;
  const historyPointsWithValues = data.monthlyHistory.filter((point) => point.total > 0).length;
  const shouldShowHistoryChart = data.hasAnyHistoricalExpenses && historyPointsWithValues >= 3;

  return (
    <div className="space-y-4">
      <ContextualHero data={data} />

      {shouldShowHistoryChart && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Evolución de los últimos meses</span>
          </div>
          <MonthlyHistoryChart data={data.monthlyHistory} />
        </div>
      )}

      {SHOW_CATEGORY_BREAKDOWN && hasExpenses && (
        <CategoryBreakdownMini
          breakdown={data.categoryBreakdown}
          variableTotal={data.variableThisMonth}
        />
      )}

      {hasExpenses && <SpendingTips tips={data.spendingTips} />}

      {data.upcomingServicesCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-100/60 px-3 py-2.5 dark:bg-amber-950">
          <Zap className={`${iconSize.sm} mt-0.5 shrink-0 text-amber-600 dark:text-amber-400`} />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Tenés {data.upcomingServicesCount} servicio{data.upcomingServicesCount !== 1 ? "s" : ""} que vence{data.upcomingServicesCount !== 1 ? "n" : ""} pronto (~{formatAmount(data.upcomingServicesCost)})
          </p>
        </div>
      )}
    </div>
  );
}
