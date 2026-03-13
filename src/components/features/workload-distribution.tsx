"use client";

import { cn } from "@/lib/utils";

interface MemberStat {
  id: string;
  name: string;
  weeklyTasks: number;
  weeklyPoints: number;
}

interface Props {
  memberStats: MemberStat[];
  className?: string;
}

export function WorkloadDistribution({ memberStats, className }: Props) {

  // Only show for multi-member households
  if (memberStats.length < 2) return null;

  const maxTasks = Math.max(...memberStats.map((m) => m.weeklyTasks), 1);
  const avg = memberStats.reduce((sum, m) => sum + m.weeklyTasks, 0) / memberStats.length;

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Distribución de tareas</h3>
        <p className="text-xs text-muted-foreground">Esta semana por persona</p>
      </div>

      <div className="space-y-3">
        {[...memberStats]
          .sort((a, b) => b.weeklyTasks - a.weeklyTasks)
          .map((member) => {
            const pct = maxTasks > 0 ? (member.weeklyTasks / maxTasks) * 100 : 0;
            const deviation = avg > 0 ? Math.abs(member.weeklyTasks - avg) / avg : 0;
            const isFair = deviation <= 0.2;

            return (
              <div key={member.id} className="flex items-center gap-3">
                {/* Avatar initial */}
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {member.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{member.name}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      {member.weeklyTasks} tarea{member.weeklyTasks !== 1 ? "s" : ""}
                      {isFair && member.weeklyTasks > 0 && (
                        <span className="text-green-500 dark:text-green-400" title="Distribución equitativa">
                          ✓
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {avg > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Promedio: {avg.toFixed(1)} tarea{avg !== 1 ? "s" : ""} por persona
        </p>
      )}
    </div>
  );
}
