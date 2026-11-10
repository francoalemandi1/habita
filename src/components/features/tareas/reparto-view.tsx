"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@habita/contracts";
import { SplitBar } from "@/components/ds/progress-bar";
import { Avatar } from "@/components/ds/avatar";
import { Skeleton } from "@/components/ds/skeleton";
import { EmptyState } from "@/components/ds/empty-state";
import { cn } from "@/lib/utils";
import { InlineError } from "../inline-error";

import type { SplitBarSegmentInput } from "@/components/ds/progress-bar";
import type { StatsResponse } from "@habita/contracts";

interface RepartoViewProps {
  currentMemberId: string;
}

const SEGMENT_COLORS = ["bg-ink", "bg-ink-2", "bg-ink-3"] as const;
const FALLBACK_SEGMENT_COLOR = "bg-ink-3";

function segmentColor(index: number): string {
  return SEGMENT_COLORS[index] ?? FALLBACK_SEGMENT_COLOR;
}

function buildSegments(values: ReadonlyArray<{ id: string; value: number }>): SplitBarSegmentInput[] {
  return values.map((entry, index) => ({
    ...entry,
    colorClassName: segmentColor(index),
  }));
}

/** Reparto view — per-member done counts this week/month (handoff §5.3 "Tareas", replaces /progress). */
export function RepartoView({ currentMemberId }: RepartoViewProps): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useQuery({
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

  if (isError) {
    return <InlineError message="No pudimos cargar el reparto." onRetry={() => refetch()} />;
  }

  if (!data || data.memberStats.length === 0) {
    return <EmptyState icon={TrendingUp} title="Sin estadísticas" description="Completá tareas para ver el reparto del hogar." />;
  }

  const members = data.memberStats.map((member) => ({ ...member, label: member.id === currentMemberId ? "Vos" : member.name }));

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
      <PeriodCard
        title="Esta semana"
        members={members.map((member) => ({ id: member.id, name: member.name, label: member.label, done: member.weeklyTasks }))}
        currentMemberId={currentMemberId}
      />
      <PeriodCard
        title="Este mes"
        members={members.map((member) => ({ id: member.id, name: member.name, label: member.label, done: member.monthlyTasks }))}
        currentMemberId={currentMemberId}
      />
      <p className="text-[13px] text-ink-2 md:col-span-2">
        Cuenta quién hizo cada tarea, aunque estuviera asignada a otra persona.
      </p>
    </div>
  );
}

interface PeriodMember {
  id: string;
  name: string;
  label: string;
  done: number;
}

interface BalanceSummary {
  text: string;
  isEven: boolean;
}

function describeBalance(members: readonly PeriodMember[]): BalanceSummary {
  const counts = members.map((member) => member.done);
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return { text: "Todavía nadie completó tareas", isEven: false };
  const spread = Math.max(...counts) - Math.min(...counts);
  if (spread <= 1) return { text: "Reparto parejo", isEven: true };
  return { text: `${total} tareas hechas`, isEven: false };
}

function PeriodCard({ title, members, currentMemberId }: { title: string; members: PeriodMember[]; currentMemberId: string }): React.JSX.Element {
  const titleId = useId();
  const total = members.reduce((sum, member) => sum + member.done, 0);
  const balance = describeBalance(members);

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={titleId} className="text-[17px] font-semibold text-ink">{title}</h2>
        <span className={cn("text-[13px]", balance.isEven ? "font-medium text-monte" : "text-ink-2")}>{balance.text}</span>
      </div>
      <SplitBar segments={buildSegments(members.map((member) => ({ id: member.id, value: member.done })))} total={total} />
      <ul className="flex flex-col divide-y divide-line-soft">
        {members.map((member, index) => (
          <li key={member.id} className="flex items-center gap-3 py-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", segmentColor(index))} aria-hidden="true" />
            <Avatar name={member.name} size={28} isSelf={member.id === currentMemberId} ringBackground="var(--color-surface)" />
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{member.label}</span>
            <span className="text-[20px] font-semibold tracking-[-.02em] text-ink">{member.done}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
