"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@habita/contracts";
import { SplitBar } from "@/components/ds/progress-bar";
import { Avatar } from "@/components/ds/avatar";
import { Skeleton } from "@/components/ds/skeleton";
import { EmptyState } from "@/components/ds/empty-state";

import type { SplitBarSegmentInput } from "@/components/ds/progress-bar";
import type { StatsResponse } from "@habita/contracts";

interface RepartoViewProps {
  currentMemberId: string;
}

const SEGMENT_COLORS = ["bg-ink", "bg-ink-2", "bg-ink-3"] as const;

function buildSegments(values: ReadonlyArray<{ id: string; value: number }>): SplitBarSegmentInput[] {
  return values.map((entry, index) => ({
    ...entry,
    colorClassName: SEGMENT_COLORS[index % SEGMENT_COLORS.length] ?? SEGMENT_COLORS[SEGMENT_COLORS.length - 1]!,
  }));
}

/** Reparto view — per-member done counts this week/month (handoff §5.3 "Tareas", replaces /progress). */
export function RepartoView({ currentMemberId }: RepartoViewProps): React.JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.stats.all(),
    queryFn: () => apiFetch<StatsResponse>("/api/stats"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (!data || data.memberStats.length === 0) {
    return <EmptyState icon={TrendingUp} title="Sin estadísticas" description="Completá tareas para ver el reparto del hogar." />;
  }

  const nameFor = (id: string, name: string) => (id === currentMemberId ? "Vos" : name);
  const weeklyTotal = data.memberStats.reduce((sum, m) => sum + m.weeklyTasks, 0);
  const monthlyTotal = data.memberStats.reduce((sum, m) => sum + m.monthlyTasks, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-[15px] font-semibold text-ink">Esta semana</h2>
        <SplitBar
          segments={buildSegments(data.memberStats.map((m) => ({ id: m.id, value: m.weeklyTasks })))}
          total={weeklyTotal}
          label={data.memberStats.map((m) => `${nameFor(m.id, m.name)} ${m.weeklyTasks}`).join(" · ")}
        />
      </div>
      <div>
        <h2 className="mb-2 text-[15px] font-semibold text-ink">Este mes</h2>
        <SplitBar
          segments={buildSegments(data.memberStats.map((m) => ({ id: m.id, value: m.monthlyTasks })))}
          total={monthlyTotal}
          label={data.memberStats.map((m) => `${nameFor(m.id, m.name)} ${m.monthlyTasks}`).join(" · ")}
        />
      </div>
      <div className="flex flex-col gap-2">
        {data.memberStats.map((member) => (
          <div key={member.id} className="flex items-center gap-3 rounded-[14px] bg-surface px-3 py-2.5">
            <Avatar name={member.name} size={28} isSelf={member.id === currentMemberId} />
            <span className="flex-1 text-[14px] text-ink">{nameFor(member.id, member.name)}</span>
            <span className="text-[13px] text-ink-2">
              {member.weeklyTasks} esta semana · {member.totalTasks} en total
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
