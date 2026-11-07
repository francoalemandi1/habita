import Link from "next/link";
import { SplitBar } from "@/components/ds/progress-bar";

import type { SplitBarSegmentInput } from "@/components/ds/progress-bar";
import { APP_ROUTES } from "@habita/contracts";
import { buildWeekLegend } from "./casa-logic";
import { TodayTasksList } from "./today-tasks-list";

import type { MemberType } from "@prisma/client";
import type { WeekTasksSummary } from "@habita/domain";
import type { TodayTaskItem } from "./today-tasks-list";

const SEGMENT_COLORS = ["bg-ink", "bg-ink-2", "bg-ink-3"] as const;

interface TareasCardProps {
  summary: WeekTasksSummary;
  isSolo: boolean;
  todayItems: TodayTaskItem[];
  currentMemberType: MemberType;
}

/** Casa board, left column (handoff §5.3 "Casa"). */
export function TareasCard({ summary, isSolo, todayItems, currentMemberType }: TareasCardProps): React.JSX.Element {
  const segments: SplitBarSegmentInput[] = summary.shares.map((share, index) => ({
    id: share.memberId,
    value: share.done,
    colorClassName: SEGMENT_COLORS[index] ?? SEGMENT_COLORS[SEGMENT_COLORS.length - 1]!,
  }));
  segments.push({ id: "remaining", value: summary.remaining, colorClassName: "bg-sand" });

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-surface p-7">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[30px] font-bold leading-none tracking-[-.03em] text-ink">Tareas</h2>
        <span className="shrink-0 text-[14px] text-ink-2">
          {summary.done} de {summary.total} hechas ·{" "}
          <Link href={APP_ROUTES.tareas} className="text-ink underline underline-offset-[3px]">
            Ver la semana
          </Link>
        </span>
      </div>

      {!isSolo && (
        <SplitBar segments={segments} total={summary.total} label={buildWeekLegend(summary.shares, summary.isEven)} />
      )}

      <div className="flex flex-col">
        <span className="pb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-3">Hoy</span>
        {/* Keyed on server data so router.refresh() replaces the optimistic copy with the truth. */}
        <TodayTasksList
          key={todayItems.map((item) => `${item.id}:${item.status}`).join("|")}
          items={todayItems}
          currentMemberType={currentMemberType}
        />
      </div>
    </div>
  );
}
