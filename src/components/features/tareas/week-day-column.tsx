"use client";

import { useDroppable } from "@dnd-kit/core";
import { formatDayHeader } from "@/lib/calendar-utils";
import { encodeDropTargetId } from "@/lib/tareas-week";
import { cn } from "@/lib/utils";
import { DraggableTaskCard } from "./task-card";

import type { WeekAssignment } from "@/hooks/use-week-assignments";
import type { TaskCardProps } from "./task-card";

interface WeekDayColumnProps {
  day: Date;
  isToday: boolean;
  assignments: readonly WeekAssignment[];
  getCardProps: (assignment: WeekAssignment) => TaskCardProps;
}

/** Due-date drop target for the day column (handoff §7 "arrastrar tarea web A"). */
export function dayDropDate(day: Date): string {
  const noon = new Date(day);
  noon.setHours(12, 0, 0, 0);
  return noon.toISOString();
}

/** Web Semana column (§5.3 Tareas web): today on Manteca soft, the rest on Arena. */
export function WeekDayColumn({ day, isToday, assignments, getCardProps }: WeekDayColumnProps): React.JSX.Element {
  const { dayName, dayNumber } = formatDayHeader(day);
  const { setNodeRef, isOver } = useDroppable({ id: encodeDropTargetId({ kind: "day", date: dayDropDate(day) }) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[420px] min-w-0 flex-col gap-2 rounded-[16px] p-2 transition-shadow duration-100",
        isToday ? "bg-manteca-soft" : "bg-sand",
        isOver && "ring-2 ring-monte",
      )}
    >
      <h2 className="px-1.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-ink">
        {dayName} {dayNumber}
        {isToday && <span className="text-ink-2"> · hoy</span>}
      </h2>
      {assignments.map((assignment) => (
        <DraggableTaskCard key={assignment.id} {...getCardProps(assignment)} />
      ))}
    </div>
  );
}
