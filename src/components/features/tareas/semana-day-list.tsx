"use client";

import { isSameDay } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

import type { WeekAssignment } from "@/hooks/use-week-assignments";
import type { TaskCardProps } from "./task-card";

const WEEKDAY_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const WEEKDAY_LETTERS = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"] as const;

interface SemanaDayListProps {
  weekDays: readonly Date[];
  assignmentsByDay: ReadonlyArray<readonly WeekAssignment[]>;
  getCardProps: (assignment: WeekAssignment) => TaskCardProps;
}

function dayCardLabel(day: Date, today: Date): string {
  const name = `${WEEKDAY_LONG[day.getDay()] ?? ""} ${day.getDate()}`;
  if (isSameDay(day, today)) return `Hoy · ${name}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(day, tomorrow)) return `Mañana · ${name}`;
  return name;
}

function dayAnchorId(day: Date): string {
  return `semana-dia-${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

/** Mobile Semana (§5.3 Tareas): 7-day strip on top, then one card per day that has tasks. */
export function SemanaDayList({ weekDays, assignmentsByDay, getCardProps }: SemanaDayListProps): React.JSX.Element {
  const today = new Date();
  const visibleDays = weekDays
    .map((day, index) => ({ day, assignments: assignmentsByDay[index] ?? [] }))
    .filter(({ day, assignments }) => assignments.length > 0 || isSameDay(day, today));

  function scrollToDay(day: Date): void {
    document.getElementById(dayAnchorId(day))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => {
          const hasTasks = (assignmentsByDay[index]?.length ?? 0) > 0;
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => scrollToDay(day)}
              disabled={!hasTasks && !isToday}
              aria-label={`${WEEKDAY_LONG[day.getDay()]} ${day.getDate()}${hasTasks ? "" : ", sin tareas"}`}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[12px] outline-none focus-visible:ring-2 focus-visible:ring-monte",
                isToday ? "bg-manteca text-ink" : "text-ink-2",
              )}
            >
              <span className="text-[11px] font-semibold tracking-[.06em]">{WEEKDAY_LETTERS[day.getDay()]}</span>
              <span className="text-[17px] font-semibold leading-none text-ink">{day.getDate()}</span>
              <span className={cn("size-1 rounded-full", hasTasks ? "bg-ink" : "bg-transparent")} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
        {visibleDays.map(({ day, assignments }) => (
          <section
            key={day.toISOString()}
            id={dayAnchorId(day)}
            aria-label={dayCardLabel(day, today)}
            className="scroll-mt-4 rounded-[20px] bg-surface px-4 pt-3"
          >
            <h2 className="border-b border-line-soft pb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">
              {dayCardLabel(day, today)}
            </h2>
            {assignments.length === 0 ? (
              <p className="py-4 text-[14px] text-ink-2">Nada para hoy.</p>
            ) : (
              <div className="divide-y divide-line-soft">
                {assignments.map((assignment) => (
                  <TaskCard key={assignment.id} {...getCardProps(assignment)} variant="row" />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
