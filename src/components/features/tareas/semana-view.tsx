"use client";

import { DndContext } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SplitBar } from "@/components/ds/progress-bar";
import { Skeleton } from "@/components/ds/skeleton";
import { formatWeekRange, isSameDay } from "@/lib/calendar-utils";
import { summarizeWeekTasks } from "@habita/domain";
import { buildWeekLegend } from "@/components/features/casa/casa-logic";
import { useTareasSemana } from "@/hooks/use-tareas-semana";
import { WeekDayColumn } from "./week-day-column";
import { WeekMemberStrip } from "./week-member-strip";
import { EditTaskSheet } from "./edit-task-sheet";
import { ChangeDaySheet } from "./change-day-sheet";
import { PasarSheet } from "./pasar-sheet";

import type { SplitBarSegmentInput } from "@/components/ds/progress-bar";

const SEGMENT_COLORS = ["bg-ink", "bg-ink-2", "bg-ink-3"] as const;

interface SemanaViewProps {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentMemberId: string;
}

/** Semana view — 7 day columns, drag to move/reassign, SplitBar footer (handoff §5.3 "Tareas"). */
export function SemanaView({ members, currentMemberId }: SemanaViewProps): React.JSX.Element {
  const semana = useTareasSemana(currentMemberId);
  const today = new Date();

  const summary = summarizeWeekTasks({
    assignments: semana.assignments.map((a) => ({
      memberId: a.memberId,
      completedByMemberId: a.completedByMemberId,
      status: a.status,
    })),
    members,
    currentMemberId,
  });
  const segments: SplitBarSegmentInput[] = summary.shares.map((share, index) => ({
    id: share.memberId,
    value: share.done,
    colorClassName: SEGMENT_COLORS[index] ?? SEGMENT_COLORS[SEGMENT_COLORS.length - 1]!,
  }));
  segments.push({ id: "remaining", value: summary.remaining, colorClassName: "bg-sand" });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Semana anterior" onClick={() => semana.setWeekOffset((v) => v - 1)}>
          <ChevronLeft className="size-5 text-ink-2" strokeWidth={1.75} />
        </button>
        <span className="text-[14px] font-medium text-ink">{formatWeekRange(semana.monday)}</span>
        <button type="button" aria-label="Semana siguiente" onClick={() => semana.setWeekOffset((v) => v + 1)}>
          <ChevronRight className="size-5 text-ink-2" strokeWidth={1.75} />
        </button>
      </div>

      {members.length > 1 && <WeekMemberStrip members={members} currentMemberId={currentMemberId} />}

      {semana.isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {semana.weekDays.map((day) => <Skeleton key={day.toISOString()} className="h-40" />)}
        </div>
      ) : (
        <DndContext onDragEnd={semana.handleDragEnd}>
          <div className="grid grid-cols-7 gap-2">
            {semana.weekDays.map((day, index) => (
              <WeekDayColumn
                key={day.toISOString()}
                day={day}
                isToday={isSameDay(day, today)}
                assignments={semana.assignmentsByDay[index] ?? []}
                currentMemberId={currentMemberId}
                rotatingTaskIds={semana.rotatingTaskIds}
                pendingTransferByAssignment={semana.pendingTransferByAssignment}
                onToggleComplete={semana.handleToggleComplete}
                onEdit={semana.setEditing}
                onChangeDay={semana.setChangingDay}
                onPasar={semana.setPasarTarget}
                onToggleRotation={semana.handleToggleRotation}
                onDelete={semana.handleDelete}
              />
            ))}
          </div>
        </DndContext>
      )}

      {!semana.isLoading && summary.total > 0 && (
        <SplitBar segments={segments} total={summary.total} label={buildWeekLegend(summary.shares, summary.isEven)} />
      )}

      {semana.editing && (
        <EditTaskSheet
          open
          onOpenChange={(open) => !open && semana.setEditing(null)}
          initialValues={{
            name: semana.editing.task.name,
            frequency: semana.editing.task.frequency,
            weight: semana.editing.task.weight,
            estimatedMinutes: semana.editing.task.estimatedMinutes,
          }}
          isSubmitting={semana.isApplyingEdit}
          onSubmit={semana.handleEditSubmit}
        />
      )}

      {semana.changingDay && (
        <ChangeDaySheet
          open
          onOpenChange={(open) => !open && semana.setChangingDay(null)}
          taskName={semana.changingDay.task.name}
          weekDays={semana.weekDays}
          currentDueDate={new Date(semana.changingDay.dueDate)}
          isSubmitting={semana.isChangingDay}
          onSelectDay={semana.handleChangeDaySubmit}
        />
      )}

      {semana.pasarTarget && (
        <PasarSheet
          open
          onOpenChange={(open) => !open && semana.setPasarTarget(null)}
          taskName={semana.pasarTarget.task.name}
          dueDate={new Date(semana.pasarTarget.dueDate)}
          members={members.filter((m) => m.id !== currentMemberId)}
          weekAssignments={semana.assignments}
          isSubmitting={semana.isRequestingTransfer}
          onSubmit={semana.handlePasarSubmit}
        />
      )}
    </div>
  );
}
