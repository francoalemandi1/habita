"use client";

import { cn } from "@/lib/utils";
import type { HouseholdHealthScore } from "@habita/contracts";

interface Props {
  data: HouseholdHealthScore;
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function scoreRingColor(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 50) return "stroke-yellow-500";
  return "stroke-red-500";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bien";
  if (score >= 40) return "Regular";
  return "Necesita atención";
}

export function HouseholdHealthScore({ data, className }: Props) {
  const { score, components } = data;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Estado del hogar</h3>
          <p className="text-xs text-muted-foreground">Basado en tareas, gastos y balance</p>
        </div>
        <span className={cn("text-xs font-medium", scoreColor(score))}>{scoreLabel(score)}</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Circular progress */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-muted"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={cn("transition-all duration-700 ease-out", scoreRingColor(score))}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-bold tabular-nums", scoreColor(score))}>
              {score}
            </span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Component breakdown */}
        <div className="flex flex-1 flex-col gap-2">
          <ComponentBar
            label="Tareas"
            score={components.tasks.score}
            total={components.tasks.total}
            detail={
              components.tasks.completedThisWeek > 0
                ? `${components.tasks.completedThisWeek} completadas esta semana`
                : components.tasks.overdueThisWeek > 0
                  ? `${components.tasks.overdueThisWeek} vencidas`
                  : "Sin tareas asignadas"
            }
          />
          <ComponentBar
            label="Gastos"
            score={components.expenses.score}
            total={components.expenses.total}
            detail={
              components.expenses.daysSinceLastExpense === 0
                ? "Registrado hoy"
                : `Hace ${components.expenses.daysSinceLastExpense} días`
            }
          />
          <ComponentBar
            label="Balance"
            score={components.balance.score}
            total={components.balance.total}
            detail={
              components.balance.totalUnsettledARS === 0
                ? "Todo saldado"
                : `$${components.balance.totalUnsettledARS.toLocaleString("es-AR")} pendiente`
            }
          />
        </div>
      </div>
    </div>
  );
}

function ComponentBar({
  label,
  score,
  total,
  detail,
}: {
  label: string;
  score: number;
  total: number;
  detail: string;
}) {
  const pct = Math.round((score / total) * 100);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 80
              ? "bg-green-500"
              : pct >= 50
                ? "bg-yellow-500"
                : "bg-red-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
