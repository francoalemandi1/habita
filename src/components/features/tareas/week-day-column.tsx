"use client";

import { useDroppable } from "@dnd-kit/core";
import { formatDayHeader } from "@/lib/calendar-utils";
import { encodeDropTargetId } from "@/lib/tareas-week";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

import type { WeekAssignment } from "@/hooks/use-week-assignments";

interface WeekDayColumnProps {
  day: Date;
  isToday: boolean;
  assignments: readonly WeekAssignment[];
  currentMemberId: string;
  rotatingTaskIds: ReadonlySet<string>;
  pendingTransferByAssignment: ReadonlyMap<string, string>;
  onToggleComplete: (assignment: WeekAssignment) => void;
  onEdit: (assignment: WeekAssignment) => void;
  onChangeDay: (assignment: WeekAssignment) => void;
  onPasar: (assignment: WeekAssignment) => void;
  onToggleRotation: (assignment: WeekAssignment) => void;
  onDelete: (assignment: WeekAssignment) => void;
}

/** Due-date drop target for the day column (handoff §7 "arrastrar tarea web A"). */
export function dayDropDate(day: Date): string {
  const noon = new Date(day);
  noon.setHours(12, 0, 0, 0);
  return noon.toISOString();
}

export function WeekDayColumn({
  day,
  isToday,
  assignments,
  currentMemberId,
  rotatingTaskIds,
  pendingTransferByAssignment,
  onToggleComplete,
  onEdit,
  onChangeDay,
  onPasar,
  onToggleRotation,
  onDelete,
}: WeekDayColumnProps): React.JSX.Element {
  const { dayName, dayNumber } = formatDayHeader(day);
  const dropId = encodeDropTargetId({ kind: "day", date: dayDropDate(day) });
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[160px] flex-col gap-2 rounded-[16px] p-2",
        isToday ? "bg-manteca-soft" : "bg-sand",
        isOver && "ring-2 ring-monte",
      )}
    >
      <div className="flex items-baseline justify-between px-1">
        <span className="text-[13px] font-semibold text-ink-2">{dayName}</span>
        <span className="text-[13px] font-semibold text-ink">{dayNumber}</span>
      </div>
      {assignments.map((assignment) => (
        <TaskCard
          key={assignment.id}
          assignment={assignment}
          currentMemberId={currentMemberId}
          pendingTransferToName={pendingTransferByAssignment.get(assignment.id) ?? null}
          isRotating={rotatingTaskIds.has(assignment.taskId)}
          onToggleComplete={() => onToggleComplete(assignment)}
          onEdit={() => onEdit(assignment)}
          onChangeDay={() => onChangeDay(assignment)}
          onPasar={() => onPasar(assignment)}
          onToggleRotation={() => onToggleRotation(assignment)}
          onDelete={() => onDelete(assignment)}
        />
      ))}
    </div>
  );
}
