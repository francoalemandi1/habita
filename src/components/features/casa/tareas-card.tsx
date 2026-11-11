import Link from "next/link";
import { APP_ROUTES } from "@habita/contracts";
import { SplitBar } from "@/components/ds/progress-bar";
import { cn } from "@/lib/utils";
import { buildWeekLegend } from "./casa-logic";
import { TodayTasksList } from "./today-tasks-list";
import { EmptyWeek } from "@/components/features/tareas/empty-week";

import type { MemberType } from "@prisma/client";
import type { WeekTasksSummary } from "@habita/domain";
import type { SplitBarSegmentInput } from "@/components/ds/progress-bar";
import type { TodayTaskItem } from "./today-tasks-list";

// §6.10: Tinta → Tinta 2 → faded gray, fixed by seniority; "remaining" is the Arena track.
const SEGMENT_COLORS = ["bg-ink", "bg-ink-2", "bg-ink-3"] as const;
const FALLBACK_SEGMENT_COLOR = "bg-ink-3";

interface TareasCardProps {
  summary: WeekTasksSummary;
  isSolo: boolean;
  todayItems: TodayTaskItem[];
  tomorrowItems: TodayTaskItem[];
  currentMemberType: MemberType;
  className?: string;
}

function buildSegments(summary: WeekTasksSummary): SplitBarSegmentInput[] {
  const segments = summary.shares.map((share, index) => ({
    id: share.memberId,
    value: share.done,
    colorClassName: SEGMENT_COLORS[index] ?? FALLBACK_SEGMENT_COLOR,
  }));
  return [...segments, { id: "remaining", value: summary.remaining, colorClassName: "bg-sand" }];
}

/** Casa board, Tareas card (§5.3 Casa): progress of the week, split, and my tasks for today (pattern A). */
export function TareasCard({ summary, isSolo, todayItems, tomorrowItems, currentMemberType, className }: TareasCardProps) {
  const hasWeekTasks = summary.total > 0;

  return (
    <section aria-labelledby="casa-tareas" className={cn("flex flex-col gap-5 rounded-[20px] bg-surface p-5 md:p-7", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="casa-tareas" className="text-[24px] font-bold leading-none tracking-[-.03em] text-ink md:text-[28px]">
          Tareas
        </h2>
        <span className="shrink-0 text-[13px] text-ink-2">
          {hasWeekTasks && `${summary.done} de ${summary.total} hechas · `}
          <Link href={APP_ROUTES.tareas} className="text-ink underline underline-offset-[3px] hover:text-monte">
            Ver semana
          </Link>
        </span>
      </div>

      {hasWeekTasks && !isSolo && (
        <div className="flex flex-col gap-2">
          <SplitBar segments={buildSegments(summary)} total={summary.total} />
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-ink-2">{buildWeekLegend(summary.shares, false)}</span>
            {summary.isEven && summary.done > 0 && <span className="font-medium text-monte">Reparto parejo</span>}
          </div>
        </div>
      )}

      {hasWeekTasks ? (
        <>
          <div className="flex flex-col">
            <span className="border-b border-line-soft pb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">
              Hoy
            </span>
            {/* Keyed on server data so router.refresh() replaces the optimistic copy with the truth. */}
            <TodayTasksList
              key={todayItems.map((item) => `${item.id}:${item.status}`).join("|")}
              items={todayItems}
              currentMemberType={currentMemberType}
            />
          </div>
          {tomorrowItems.length > 0 && (
            <div className="flex flex-col">
              <span className="border-b border-line-soft pb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">
                Mañana
              </span>
              <TodayTasksList
                key={tomorrowItems.map((item) => `${item.id}:${item.status}`).join("|")}
                items={tomorrowItems}
                currentMemberType={currentMemberType}
              />
            </div>
          )}
        </>
      ) : (
        <EmptyWeek className="pt-2" />
      )}
    </section>
  );
}
