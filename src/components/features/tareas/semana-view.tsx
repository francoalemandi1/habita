"use client";

import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { summarizeWeekTasks } from "@habita/domain";
import { SplitBar } from "@/components/ds/progress-bar";
import { Skeleton } from "@/components/ds/skeleton";
import { EmptyState } from "@/components/ds/empty-state";
import { Button } from "@/components/ds/button";
import { getISOWeekNumber } from "@/lib/calendar-utils";
import { buildWeekLegend } from "@/components/features/casa/casa-logic";
import { useTareasSemana } from "@/hooks/use-tareas-semana";
import { SemanaBoard } from "./semana-board";
import { SemanaDayList } from "./semana-day-list";
import { EditTaskSheet } from "./edit-task-sheet";
import { ChangeDaySheet } from "./change-day-sheet";
import { PasarSheet } from "./pasar-sheet";
import { EmptyWeek } from "./empty-week";

import type { WeekTasksSummary } from "@habita/domain";
import type { SplitBarSegmentInput } from "@/components/ds/progress-bar";
import type { WeekAssignment } from "@/hooks/use-week-assignments";
import type { TaskCardProps } from "./task-card";

const SEGMENT_COLORS = ["bg-ink", "bg-ink-2", "bg-ink-3"] as const;
const FALLBACK_SEGMENT_COLOR = "bg-ink-3";
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

interface SemanaViewProps {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentMemberId: string;
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const end = `${sunday.getDate()} ${MONTHS_SHORT[sunday.getMonth()] ?? ""}`;
  const start = monday.getMonth() === sunday.getMonth() ? `${monday.getDate()}` : `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()] ?? ""}`;
  return `Semana ${getISOWeekNumber(monday)} · ${start} al ${end}`;
}

function buildSegments(summary: WeekTasksSummary): SplitBarSegmentInput[] {
  const segments = summary.shares.map((share, index) => ({
    id: share.memberId,
    value: share.done,
    colorClassName: SEGMENT_COLORS[index] ?? FALLBACK_SEGMENT_COLOR,
  }));
  return [...segments, { id: "remaining", value: summary.remaining, colorClassName: "bg-sand" }];
}

/** Semana view — web 7 columns with drag, mobile day strip + day cards, Reparto footer (§5.3 Tareas). */
export function SemanaView({ members, currentMemberId }: SemanaViewProps): React.JSX.Element {
  const semana = useTareasSemana(currentMemberId);
  const summary = summarizeWeekTasks({
    assignments: semana.assignments.map((a) => ({
      memberId: a.memberId,
      completedByMemberId: a.completedByMemberId,
      status: a.status,
    })),
    members,
    currentMemberId,
  });

  function getCardProps(assignment: WeekAssignment): TaskCardProps {
    return {
      assignment,
      currentMemberId,
      pendingTransferToName: semana.pendingTransferByAssignment.get(assignment.id) ?? null,
      isRotating: semana.rotatingTaskIds.has(assignment.taskId),
      isSyncPending: semana.pendingAssignmentIds.has(assignment.id),
      onToggleComplete: () => semana.handleToggleComplete(assignment),
      onEdit: () => semana.setEditing(assignment),
      onChangeDay: () => semana.setChangingDay(assignment),
      onPasar: () => semana.setPasarTarget(assignment),
      onToggleRotation: () => semana.handleToggleRotation(assignment),
      onDelete: () => semana.handleDelete(assignment),
    };
  }

  const hasTasks = semana.assignments.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <WeekArrow direction="previous" onClick={() => semana.setWeekOffset((value) => value - 1)} />
          <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[.08em] text-ink">
            {formatWeekLabel(semana.monday)}
          </span>
          <WeekArrow direction="next" onClick={() => semana.setWeekOffset((value) => value + 1)} />
        </div>
        {semana.weekOffset !== 0 && (
          <button
            type="button"
            onClick={() => semana.setWeekOffset(0)}
            className="rounded-[8px] px-2 py-1 text-[13px] font-medium text-monte outline-none hover:underline focus-visible:ring-2 focus-visible:ring-monte"
          >
            Esta semana
          </button>
        )}
        {semana.weekOffset === 0 && hasTasks && (
          <span className="text-[13px] text-ink-2">
            {summary.done} de {summary.total} hechas
          </span>
        )}
      </div>

      {semana.isLoading && <SemanaSkeleton />}
      {semana.isError && (
        <EmptyState
          icon={AlertTriangle}
          title="No pudimos cargar la semana"
          description="Revisá tu conexión e intentá de nuevo."
          action={<Button onClick={() => semana.refetch()}>Reintentar</Button>}
        />
      )}
      {!semana.isLoading && !semana.isError && !hasTasks && (
        <EmptyWeek isCurrentWeek={semana.weekOffset === 0} className="rounded-[20px] bg-surface p-6" />
      )}
      {!semana.isLoading && !semana.isError && hasTasks && (
        <>
          <div className="hidden md:block">
            <SemanaBoard
              weekDays={semana.weekDays}
              assignmentsByDay={semana.assignmentsByDay}
              members={members}
              currentMemberId={currentMemberId}
              getCardProps={getCardProps}
              onDragEnd={semana.handleDragEnd}
            />
          </div>
          <div className="md:hidden">
            <SemanaDayList weekDays={semana.weekDays} assignmentsByDay={semana.assignmentsByDay} getCardProps={getCardProps} />
          </div>
          {members.length > 1 && (
            <div className="flex flex-col gap-2 rounded-[16px] bg-surface px-4 py-3 md:flex-row md:items-center md:gap-4">
              <span className="text-[14px] font-semibold text-ink">Reparto</span>
              <SplitBar segments={buildSegments(summary)} total={summary.total} className="flex-1" />
              <div className="flex items-center justify-between gap-3 text-[13px] md:justify-start">
                <span className="text-ink-2">{buildWeekLegend(summary.shares, false)}</span>
                {summary.isEven && summary.done > 0 && <span className="font-medium text-monte">Parejo</span>}
              </div>
            </div>
          )}
        </>
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

function WeekArrow({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "previous" ? "Semana anterior" : "Semana siguiente"}
      className="flex size-9 items-center justify-center rounded-[10px] text-ink-2 outline-none hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-monte"
    >
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

function SemanaSkeleton(): React.JSX.Element {
  return (
    <>
      <div className="hidden grid-cols-7 gap-2 md:grid">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-[420px] rounded-[16px]" />
        ))}
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        <Skeleton className="h-14 w-full rounded-[12px]" />
        <Skeleton className="h-48 w-full rounded-[20px]" />
      </div>
    </>
  );
}
