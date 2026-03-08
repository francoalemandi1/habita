"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Loader2, ArrowRight } from "lucide-react";
import { FridgeCalendarDay } from "@/components/features/fridge-calendar-day";
import { apiFetch } from "@/lib/api-client";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import { cn } from "@/lib/utils";
import {
  getWeekMonday,
  getDaysInRange,
  formatDateRange,
  isSameDay,
} from "@/lib/calendar-utils";
import { cyclingColors, contrastText, spacing, iconSize } from "@/lib/design-tokens";
import { PlanFeedbackDialog } from "@/components/features/plan-feedback-dialog";

import type { DateRange } from "react-day-picker";
import type { CalendarAssignment, CalendarMember } from "@/components/features/fridge-calendar-day";

interface FridgeCalendarViewProps {
  initialAssignments: CalendarAssignment[];
  members: CalendarMember[];
  initialWeekStart: string;
  hideBackButton?: boolean;
  showPlanCta?: boolean;
  isSolo?: boolean;
}

interface CompleteResponse {
  planFinalized?: boolean;
  finalizedPlanId?: string;
}

interface AssignmentsResponse {
  assignments: CalendarAssignment[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

/** ISO index of a JS Date (0=Mon, 6=Sun) */
function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

const DAY_HEADER_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

/** Micro-rotations for handwritten imperfection — one per weekday */
const DAY_ROTATIONS = [-0.3, 0.15, -0.1, 0.25, -0.2, 0.1, -0.15];

/** Group assignments by day, then by member within each day */
function groupByDayAndMember(
  assignments: CalendarAssignment[],
  viewDays: Date[],
) {
  return viewDays.map((day) => {
    const dayAssignments = assignments.filter((a) =>
      isSameDay(new Date(a.dueDate), day),
    );

    const memberMap = new Map<
      string,
      { member: CalendarMember; assignments: CalendarAssignment[] }
    >();

    for (const assignment of dayAssignments) {
      const existing = memberMap.get(assignment.member.id);
      if (existing) {
        existing.assignments.push(assignment);
      } else {
        memberMap.set(assignment.member.id, {
          member: assignment.member,
          assignments: [assignment],
        });
      }
    }

    for (const group of memberMap.values()) {
      group.assignments.sort((a, b) => a.task.name.localeCompare(b.task.name));
    }

    return {
      date: day,
      memberGroups: Array.from(memberMap.values()),
    };
  });
}

export function FridgeCalendarView({
  initialAssignments,
  members,
  initialWeekStart,
  showPlanCta = false,
}: FridgeCalendarViewProps) {
  const today = useMemo(() => new Date(), []);

  // Range state — default to the initial week
  const [rangeStart, setRangeStart] = useState<Date>(() => {
    const d = new Date(initialWeekStart);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [rangeEnd, setRangeEnd] = useState<Date>(() => {
    const d = new Date(initialWeekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  });
  // viewStart = first day of the 7-column window
  const [viewStart, setViewStart] = useState<Date>(() => {
    const d = new Date(initialWeekStart);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [assignments, setAssignments] = useState<CalendarAssignment[]>(initialAssignments);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [feedbackPlanId, setFeedbackPlanId] = useState<string | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(() => {
    const monday = new Date(initialWeekStart);
    monday.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      if (isSameDay(d, new Date())) return i;
    }
    return 0;
  });

  const router = useRouter();
  const toast = useToast();

  // All days in the selected range (max 31)
  const rangeDays = useMemo(() => getDaysInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  // 7-column sliding window
  const viewDays = useMemo(() => {
    const idx = rangeDays.findIndex((d) => isSameDay(d, viewStart));
    const from = idx >= 0 ? idx : 0;
    return rangeDays.slice(from, from + 7);
  }, [rangeDays, viewStart]);

  const rangeLabel = useMemo(() => formatDateRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  const canGoPrev = useMemo(() => !isSameDay(viewStart, rangeStart), [viewStart, rangeStart]);
  const canGoNext = useMemo(() => {
    const last = viewDays[viewDays.length - 1];
    return last ? !isSameDay(last, rangeEnd) : false;
  }, [viewDays, rangeEnd]);

  const isCurrentRange = useMemo(
    () => isSameDay(rangeStart, getWeekMonday(today)) && viewDays.length === 7 && isSameDay(viewStart, rangeStart),
    [rangeStart, viewDays, viewStart, today],
  );

  const weekStats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(
      (a) => a.status === "COMPLETED" || a.status === "VERIFIED",
    ).length;
    return { total, completed };
  }, [assignments]);

  const dayData = useMemo(
    () => groupByDayAndMember(assignments, viewDays),
    [assignments, viewDays],
  );

  const hasAnyAssignments = assignments.length > 0;

  // Fetch assignments for a window of days
  const fetchWindow = useCallback(
    async (from: Date, to: Date) => {
      const toEnd = new Date(to);
      toEnd.setHours(23, 59, 59, 999);
      setIsLoadingWeek(true);
      try {
        const data = await apiFetch<AssignmentsResponse>(
          `/api/assignments?from=${from.toISOString()}&to=${toEnd.toISOString()}&limit=100`,
        );
        setAssignments(data.assignments.filter((a) => a.status !== "CANCELLED"));
      } catch {
        toast.error("No se pudo cargar el período");
      } finally {
        setIsLoadingWeek(false);
      }
    },
    [toast],
  );

  const navigateDay = useCallback(
    async (direction: -1 | 1) => {
      const newViewStart = new Date(viewStart);
      newViewStart.setDate(newViewStart.getDate() + direction);
      newViewStart.setHours(0, 0, 0, 0);

      const fromIdx = rangeDays.findIndex((d) => isSameDay(d, newViewStart));
      const from = fromIdx >= 0 ? fromIdx : 0;
      const newViewDays = rangeDays.slice(from, from + 7);
      const fetchFrom = newViewDays[0];
      const fetchTo = newViewDays[newViewDays.length - 1];
      if (!fetchFrom || !fetchTo) return;

      await fetchWindow(fetchFrom, fetchTo);
      setViewStart(newViewStart);
      const todayIdx = newViewDays.findIndex((d) => isSameDay(d, new Date()));
      setCurrentDayIndex(todayIdx >= 0 ? todayIdx : 0);
    },
    [viewStart, rangeDays, fetchWindow],
  );

  const handleRangeChange = useCallback(
    async (range: DateRange | undefined) => {
      if (!range?.from || !range?.to) return;
      const newFrom = new Date(range.from);
      newFrom.setHours(0, 0, 0, 0);
      const maxTo = new Date(newFrom);
      maxTo.setDate(maxTo.getDate() + 30);
      const newTo = range.to > maxTo ? maxTo : new Date(range.to);
      newTo.setHours(23, 59, 59, 999);

      setRangeStart(newFrom);
      setRangeEnd(newTo);
      setViewStart(newFrom);
      setDatePickerOpen(false);

      // Fetch first 7 days of new range
      const days7End = new Date(newFrom);
      days7End.setDate(days7End.getDate() + 6);
      const fetchTo = days7End < newTo ? days7End : newTo;
      await fetchWindow(newFrom, fetchTo);

      const todayIdx = getDaysInRange(newFrom, fetchTo).findIndex((d) => isSameDay(d, new Date()));
      setCurrentDayIndex(todayIdx >= 0 ? todayIdx : 0);
    },
    [fetchWindow],
  );

  const goToToday = useCallback(() => {
    const todayMonday = getWeekMonday(new Date());
    const todaySunday = new Date(todayMonday);
    todaySunday.setDate(todaySunday.getDate() + 6);
    todaySunday.setHours(23, 59, 59, 999);
    setRangeStart(todayMonday);
    setRangeEnd(todaySunday);
    setViewStart(todayMonday);
    setAssignments(initialAssignments);
    const days = getDaysInRange(todayMonday, todaySunday);
    const todayIdx = days.findIndex((d) => isSameDay(d, new Date()));
    setCurrentDayIndex(todayIdx >= 0 ? todayIdx : 0);
  }, [initialAssignments]);

  const handleComplete = useCallback(
    async (assignmentId: string) => {
      if (completingId) return;
      setCompletingId(assignmentId);
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (response.ok) {
          const data = (await response.json()) as CompleteResponse;
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignmentId
                ? { ...a, status: "COMPLETED" as const, completedAt: new Date().toISOString() }
                : a,
            ),
          );
          toast.success("Tarea completada");
          if (data.planFinalized) {
            toast.success("Todas las tareas del plan fueron completadas.");
            if (data.finalizedPlanId) setFeedbackPlanId(data.finalizedPlanId);
          }
          router.refresh();
        } else {
          const errorData = (await response.json()) as { error?: string };
          toast.error(errorData.error ?? "No se pudo completar la tarea");
        }
      } catch {
        toast.error("No se pudo completar la tarea");
      } finally {
        setCompletingId(null);
      }
    },
    [completingId, toast, router],
  );

  const handleUncomplete = useCallback(
    async (assignmentId: string) => {
      if (completingId) return;
      setCompletingId(assignmentId);
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/uncomplete`, {
          method: "POST",
        });
        if (response.ok) {
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignmentId
                ? { ...a, status: "PENDING" as const, completedAt: null }
                : a,
            ),
          );
          toast.success("La tarea volvió a pendiente");
          router.refresh();
        } else {
          const errorData = (await response.json()) as { error?: string };
          toast.error(errorData.error ?? "No se pudo desmarcar la tarea");
        }
      } catch {
        toast.error("No se pudo desmarcar la tarea");
      } finally {
        setCompletingId(null);
      }
    },
    [completingId, toast, router],
  );

  // Mobile swipe
  const handleSwipeLeft = useCallback(() => {
    setCurrentDayIndex((prev) => Math.min(prev + 1, viewDays.length - 1));
  }, [viewDays.length]);

  const handleSwipeRight = useCallback(() => {
    setCurrentDayIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset } = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  const numCols = viewDays.length;

  return (
    <div className={spacing.contentStackCompact}>
      {/* Notebook calendar container */}
      <div className="notebook-paper notebook-binding notebook-border relative overflow-hidden rounded-lg">
        {/* Header strip */}
        <div className="notebook-header relative flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          {/* Left nav */}
          <button
            type="button"
            onClick={() => void navigateDay(-1)}
            disabled={!canGoPrev || isLoadingWeek}
            aria-label="Día anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-all hover:bg-foreground/8 active:scale-95 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className={iconSize.md} />
          </button>

          {/* Center: date range label → opens date picker */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-2">
              {isLoadingWeek && (
                <Loader2 className={`${iconSize.sm} animate-spin text-foreground-tertiary`} />
              )}
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="handwritten-title text-lg font-normal tracking-wide sm:text-xl cursor-pointer hover:opacity-70 transition-opacity focus-visible:outline-none"
                    style={{ transform: "rotate(-0.3deg)" }}
                  >
                    {rangeLabel}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="center">
                  <p className="mb-2 text-xs text-muted-foreground font-medium">
                    Seleccioná el período (máx. 1 mes)
                  </p>
                  <Calendar
                    mode="range"
                    selected={{ from: rangeStart, to: rangeEnd }}
                    onSelect={(range) => void handleRangeChange(range)}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {weekStats.total > 0 && (
              <span className="handwritten-note text-sm text-foreground-tertiary">
                {weekStats.completed}/{weekStats.total} completadas
              </span>
            )}
          </div>

          {/* Right nav */}
          <button
            type="button"
            onClick={() => void navigateDay(1)}
            disabled={!canGoNext || isLoadingWeek}
            aria-label="Día siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-all hover:bg-foreground/8 active:scale-95 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className={iconSize.md} />
          </button>
        </div>

        {/* "Ir a hoy" strip */}
        {!isCurrentRange && (
          <div className="notebook-dashed flex justify-center py-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="handwritten-title h-6 rounded-full px-3 text-sm font-normal text-primary hover:bg-primary/10"
              onClick={goToToday}
            >
              Ir a hoy
            </Button>
          </div>
        )}

        {/* Calendar body */}
        {!hasAnyAssignments && !isLoadingWeek ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5">
              <span className="text-3xl">📋</span>
            </div>
            <p className="handwritten-title text-lg text-foreground-secondary">
              No hay tareas en este período
            </p>
            <p className="handwritten-note mt-1 text-base text-foreground-tertiary">
              Las asignaciones aparecerán aquí
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: sliding 7-column grid */}
            <div className="hidden sm:block">
              {/* Day-of-week header row */}
              <div
                className="notebook-divider grid"
                style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
              >
                {viewDays.map((day) => {
                  const isoIdx = isoWeekday(day);
                  const label = DAY_HEADER_LABELS[isoIdx] ?? "";
                  const rotation = DAY_ROTATIONS[isoIdx] ?? 0;
                  const isWeekend = isoIdx >= 5;
                  return (
                    <div
                      key={day.toISOString()}
                      className={`handwritten-title py-2 text-center text-base tracking-wider ${
                        isWeekend ? "text-foreground-tertiary" : "text-foreground-secondary"
                      }`}
                      style={{ transform: `rotate(${rotation}deg)`, letterSpacing: "1px" }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

              {/* Day number row */}
              <div
                className="notebook-subdivider grid"
                style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
              >
                {dayData.map((day, i) => {
                  const isToday = isSameDay(day.date, today);
                  const dayNum = day.date.getDate();
                  const isoIdx = isoWeekday(day.date);
                  const rotation = DAY_ROTATIONS[isoIdx] ?? 0;
                  return (
                    <div
                      key={day.date.toISOString()}
                      className={`flex justify-center py-1.5 ${i < numCols - 1 ? "border-r border-[#e8e4dc] dark:border-[hsl(220_13%_20%)]" : ""}`}
                    >
                      <span
                        className={`handwritten-note flex h-8 w-8 items-center justify-center text-xl font-semibold ${
                          isToday
                            ? "notebook-today-highlight rounded-full text-primary"
                            : "text-foreground-secondary"
                        }`}
                        style={{ transform: `rotate(${rotation * 1.5}deg)` }}
                      >
                        {dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Day content cells */}
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))` }}
              >
                {dayData.map((day, i) => (
                  <FridgeCalendarDay
                    key={day.date.toISOString()}
                    date={day.date}
                    isToday={isSameDay(day.date, today)}
                    memberGroups={day.memberGroups}
                    allMembers={members}
                    completingId={completingId}
                    onComplete={handleComplete}
                    onUncomplete={handleUncomplete}
                    isLast={i === numCols - 1}
                    variant="desktop"
                  />
                ))}
              </div>
            </div>

            {/* Mobile: single-day swipe view */}
            <div className="sm:hidden overflow-hidden">
              {/* Day dots indicator */}
              <div className="notebook-dashed flex items-center justify-center gap-1 py-2">
                {viewDays.map((day, index) => {
                  const isActive = index === currentDayIndex;
                  const isDayToday = isSameDay(day, today);
                  const dayEntry = dayData[index];
                  const hasTasks = dayEntry ? dayEntry.memberGroups.length > 0 : false;
                  const isoIdx = isoWeekday(day);
                  const label = DAY_HEADER_LABELS[isoIdx] ?? "";

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setCurrentDayIndex(index)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive && "bg-primary/10",
                      )}
                    >
                      <span
                        className={cn(
                          "handwritten-title text-[10px]",
                          isActive ? "text-primary" : "text-foreground-tertiary",
                        )}
                      >
                        {label}
                      </span>
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-sm handwritten-note",
                          isActive && isDayToday && "bg-primary text-white",
                          isActive && !isDayToday && "bg-primary/15 text-primary",
                          !isActive && isDayToday && "text-primary font-bold",
                          !isActive && !isDayToday && "text-foreground-tertiary",
                        )}
                      >
                        {day.getDate()}
                      </span>
                      {hasTasks && !isActive && (
                        <div className="h-1 w-1 rounded-full bg-foreground/25" />
                      )}
                      {!hasTasks && !isActive && <div className="h-1 w-1" />}
                    </button>
                  );
                })}
              </div>

              {/* Swipeable day content */}
              <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                <div
                  className={cn(
                    "day-slide-container",
                    dragOffset !== 0 && "day-slide-container--dragging",
                  )}
                  style={{ transform: `translateX(${dragOffset}px)` }}
                >
                  {dayData[currentDayIndex] ? (
                    <FridgeCalendarDay
                      date={dayData[currentDayIndex].date}
                      isToday={isSameDay(dayData[currentDayIndex].date, today)}
                      memberGroups={dayData[currentDayIndex].memberGroups}
                      allMembers={members}
                      completingId={completingId}
                      onComplete={handleComplete}
                      onUncomplete={handleUncomplete}
                      variant="mobile"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Plan CTA */}
      {showPlanCta && (
        <div className="flex justify-center">
          <Link
            href="/plan"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Generar un nuevo plan de tareas
            <ArrowRight className={iconSize.sm} />
          </Link>
        </div>
      )}

      {/* Member legend */}
      {members.length > 0 && hasAnyAssignments && (
        <div className="flex flex-wrap items-center justify-center gap-3 px-2">
          {members.map((member, i) => {
            const bgColor = cyclingColors[i % cyclingColors.length]!;
            const firstName = member.name.split(" ")[0] ?? member.name;
            return (
              <div key={member.id} className="flex items-center gap-1.5">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    backgroundColor: bgColor,
                    color: contrastText(bgColor),
                    boxShadow: `0 1px 3px ${bgColor}40`,
                  }}
                >
                  {(member.name[0] ?? "?").toUpperCase()}
                </div>
                <span className="handwritten-note text-sm text-foreground-secondary">{firstName}</span>
              </div>
            );
          })}
        </div>
      )}

      {feedbackPlanId && (
        <PlanFeedbackDialog
          planId={feedbackPlanId}
          open
          onClose={() => setFeedbackPlanId(null)}
        />
      )}
    </div>
  );
}
