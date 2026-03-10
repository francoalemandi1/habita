"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Users, CheckCircle2, Clock, Flame, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api-client";

import type { StatsResponse } from "@habita/contracts";

interface ProgressViewProps {
  currentMemberId: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

const MEMBER_TYPE_LABELS: Record<string, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño",
};

export function ProgressView({ currentMemberId }: ProgressViewProps) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<StatsResponse>("/api/stats");
      setData(data);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <>
        <PageHeader backButton icon={TrendingUp} title="Progreso" subtitle="Ranking semanal del hogar." />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!data || data.memberStats.length === 0) {
    return (
      <>
        <PageHeader backButton icon={TrendingUp} title="Progreso" subtitle="Ranking semanal del hogar." />
        <EmptyState icon={TrendingUp} title="Sin estadísticas" description="Completá tareas para ver el progreso del hogar." />
      </>
    );
  }

  const sorted = [...data.memberStats].sort((a, b) => b.weeklyTasks - a.weeklyTasks);
  const maxWeekly = sorted[0]?.weeklyTasks ?? 1;
  const maxMonthly = Math.max(...data.memberStats.map((m) => m.monthlyTasks), 1);

  return (
    <>
      <PageHeader backButton icon={TrendingUp} title="Progreso" subtitle="Ranking semanal del hogar." />

      {/* Household totals */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-green-50 p-3 text-center dark:bg-green-950/30">
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{data.totals.completed}</p>
          <p className="text-xs text-green-600 dark:text-green-400">Completadas</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-3 text-center dark:bg-amber-950/30">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{data.totals.pending}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">Pendientes</p>
        </div>
        <div className="rounded-xl border bg-blue-50 p-3 text-center dark:bg-blue-950/30">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.totals.members}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">Miembros</p>
        </div>
      </div>

      {/* Streak */}
      {data.householdStreak > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border bg-orange-50 px-4 py-3 dark:bg-orange-950/30">
          <Flame className="h-5 w-5 text-orange-500" />
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
            {data.householdStreak} semana{data.householdStreak !== 1 ? "s" : ""} consecutiva{data.householdStreak !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Member ranking */}
      <div className="space-y-3">
        {sorted.map((member, index) => {
          const isMe = member.id === currentMemberId;
          const medal = MEDALS[index];

          return (
            <div
              key={member.id}
              className={cn(
                "rounded-xl border bg-card p-4 transition-colors",
                isMe && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
                    {medal ?? `#${index + 1}`}
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.name}
                      {isMe && <span className="ml-1 text-xs text-muted-foreground">(vos)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {MEMBER_TYPE_LABELS[member.memberType] ?? member.memberType}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{member.weeklyTasks}</p>
                  <p className="text-xs text-muted-foreground">esta semana</p>
                </div>
              </div>

              {/* Progress bars */}
              <div className="mt-3 space-y-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Esta semana</span>
                    <span>{member.weeklyTasks}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${maxWeekly > 0 ? (member.weeklyTasks / maxWeekly) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Este mes</span>
                    <span>{member.monthlyTasks}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${maxMonthly > 0 ? (member.monthlyTasks / maxMonthly) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Total histórico: {member.totalTasks} tarea{member.totalTasks !== 1 ? "s" : ""}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
