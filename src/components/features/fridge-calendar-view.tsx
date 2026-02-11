"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react";
import { FridgeCalendarDay } from "@/components/features/fridge-calendar-day";
import { BackButton } from "@/components/ui/back-button";
import { apiFetch } from "@/lib/api-client";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import { cn } from "@/lib/utils";
import {
  getWeekMonday,
  getWeekSunday,
  getWeekDays,
  formatWeekRange,
  isSameDay,
} from "@/lib/calendar-utils";
import { cyclingColors, contrastText, spacing, iconSize } from "@/lib/design-tokens";

import type { CalendarAssignment, CalendarMember } from "@/components/features/fridge-calendar-day";

interface FridgeCalendarViewProps {
  initialAssignments: CalendarAssignment[];
  members: CalendarMember[];
  initialWeekStart: string;
}

interface CompleteResponse {
  pointsEarned: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  newAchievements?: Array<{ name: string }>;
  planFinalized?: boolean;
}

interface AssignmentsResponse {
  assignments: CalendarAssignment[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

const DAY_HEADER_LABELS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

/** Micro-rotations for handwritten imperfection — one per weekday */
const DAY_ROTATIONS = [-0.3, 0.15, -0.1, 0.25, -0.2, 0.1, -0.15];

/** Group assignments by day, then by member within each day */
function groupByDayAndMember(
  assignments: CalendarAssignment[],
  weekDays: Date[],
) {
  return weekDays.map((day) => {
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

    // Sort assignments within each member group by suggested start time
    for (const group of memberMap.values()) {
      group.assignments.sort((a, b) =>
        (a.suggestedStartTime ?? "99:99").localeCompare(b.suggestedStartTime ?? "99:99")
      );
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
}: FridgeCalendarViewProps) {
  const [weekStart, setWeekStart] = useState(
    () => new Date(initialWeekStart),
  );
  const [assignments, setAssignments] =
    useState<CalendarAssignment[]>(initialAssignments);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(() => {
    const todayDate = new Date();
    const monday = new Date(initialWeekStart);
    const days = getWeekDays(monday);
    const todayIdx = days.findIndex((d) => isSameDay(d, todayDate));
    return todayIdx >= 0 ? todayIdx : 0;
  });

  const router = useRouter();
  const toast = useToast();
  const today = useMemo(() => new Date(), []);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekLabel = useMemo(() => formatWeekRange(weekStart), [weekStart]);
  const isCurrentWeek = useMemo(
    () => isSameDay(getWeekMonday(today), weekStart),
    [today, weekStart],
  );

  const dayData = useMemo(
    () => groupByDayAndMember(assignments, weekDays),
    [assignments, weekDays],
  );

  const navigateWeek = useCallback(
    async (direction: -1 | 1) => {
      const newMonday = new Date(weekStart);
      newMonday.setDate(newMonday.getDate() + direction * 7);
      newMonday.setHours(0, 0, 0, 0);
      const newSunday = getWeekSunday(newMonday);

      setIsLoadingWeek(true);
      try {
        const data = await apiFetch<AssignmentsResponse>(
          `/api/assignments?from=${newMonday.toISOString()}&to=${newSunday.toISOString()}&limit=100`,
        );
        const filtered = data.assignments.filter(
          (a) => a.status !== "CANCELLED",
        );
        setAssignments(filtered);
        setWeekStart(newMonday);
        // Reset mobile day view — show today if in current week, else Monday
        const newDays = getWeekDays(newMonday);
        const todayIdx = newDays.findIndex((d) => isSameDay(d, new Date()));
        setCurrentDayIndex(todayIdx >= 0 ? todayIdx : 0);
      } catch {
        toast.error("Error", "No se pudo cargar la semana");
      } finally {
        setIsLoadingWeek(false);
      }
    },
    [weekStart, toast],
  );

  const handleComplete = useCallback(
    async (assignmentId: string) => {
      if (completingId) return;
      setCompletingId(assignmentId);

      try {
        const response = await fetch(
          `/api/assignments/${assignmentId}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          },
        );

        if (response.ok) {
          const data = (await response.json()) as CompleteResponse;

          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignmentId
                ? { ...a, status: "COMPLETED" as const, completedAt: new Date().toISOString() }
                : a,
            ),
          );

          let message = `+${data.pointsEarned} XP`;
          if (data.leveledUp) {
            message += ` · Nivel ${data.newLevel}!`;
          }
          if (data.newAchievements && data.newAchievements.length > 0) {
            const names = data.newAchievements.map((a) => a.name).join(", ");
            message += ` · Logro: ${names}`;
          }

          toast.success("¡Tarea completada!", message);

          if (data.planFinalized) {
            toast.success(
              "Plan finalizado",
              "Todas las tareas del plan fueron completadas.",
            );
          }

          router.refresh();
        } else {
          const errorData = (await response.json()) as { error?: string };
          toast.error(
            "Error",
            errorData.error ?? "No se pudo completar la tarea",
          );
        }
      } catch {
        toast.error("Error", "No se pudo completar la tarea");
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
        const response = await fetch(
          `/api/assignments/${assignmentId}/uncomplete`,
          { method: "POST" },
        );

        if (response.ok) {
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignmentId
                ? { ...a, status: "PENDING" as const, completedAt: null }
                : a,
            ),
          );
          toast.success("Tarea desmarcada", "La tarea volvió a pendiente");
          router.refresh();
        } else {
          const errorData = (await response.json()) as { error?: string };
          toast.error(
            "Error",
            errorData.error ?? "No se pudo desmarcar la tarea",
          );
        }
      } catch {
        toast.error("Error", "No se pudo desmarcar la tarea");
      } finally {
        setCompletingId(null);
      }
    },
    [completingId, toast, router],
  );

  // Mobile: swipe between days
  const handleSwipeLeft = useCallback(() => {
    setCurrentDayIndex((prev) => Math.min(prev + 1, 6));
  }, []);

  const handleSwipeRight = useCallback(() => {
    setCurrentDayIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset } =
    useSwipeGesture({
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight,
    });

  const hasAnyAssignments = assignments.length > 0;

  // Count stats for the week summary
  const weekStats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(
      (a) => a.status === "COMPLETED" || a.status === "VERIFIED",
    ).length;
    return { total, completed };
  }, [assignments]);

  return (
    <div className={spacing.contentStackCompact}>
      {/* Header */}
      <div>
        <BackButton />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
          <CalendarDays className={`${iconSize.xl} text-primary shrink-0`} />
          Calendario semanal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {weekStats.total > 0
            ? `${weekStats.completed}/${weekStats.total} tareas completadas esta semana`
            : "Vista de la semana del hogar"}
        </p>
      </div>

      {/* Notebook calendar container */}
      <div
        className="notebook-paper notebook-binding relative overflow-hidden rounded-lg shadow-lg dark:bg-card"
        style={{
          border: "1.5px solid #d4d0c8",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04), 2px 2px 0 #f0ece4",
        }}
      >
        {/* Header strip — pen-drawn style */}
        <div
          className="relative flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4"
          style={{
            borderBottom: "1.5px solid #c4bfb3",
            background: "linear-gradient(180deg, #fdfcf7 0%, #f8f4ec 100%)",
          }}
        >
          {/* Left nav */}
          <button
            type="button"
            onClick={() => navigateWeek(-1)}
            disabled={isLoadingWeek}
            aria-label="Semana anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-all hover:bg-foreground/8 active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className={iconSize.md} />
          </button>

          {/* Center: month + week range */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-2">
              {isLoadingWeek && (
                <Loader2 className={`${iconSize.sm} animate-spin text-foreground-tertiary`} />
              )}
              <span
                className="handwritten-title text-lg font-normal tracking-wide sm:text-xl"
                style={{ transform: "rotate(-0.3deg)" }}
              >
                {weekLabel}
              </span>
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
            onClick={() => navigateWeek(1)}
            disabled={isLoadingWeek}
            aria-label="Semana siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-all hover:bg-foreground/8 active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className={iconSize.md} />
          </button>
        </div>

        {/* "Ir a hoy" strip */}
        {!isCurrentWeek && (
          <div
            className="flex justify-center py-1.5"
            style={{ borderBottom: "1px dashed #d4d0c8" }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="handwritten-title h-6 rounded-full px-3 text-sm font-normal text-primary hover:bg-primary/10"
              onClick={() => {
                const todayMonday = getWeekMonday(new Date());
                setWeekStart(todayMonday);
                setAssignments(initialAssignments);
                const days = getWeekDays(todayMonday);
                const todayIdx = days.findIndex((d) => isSameDay(d, new Date()));
                setCurrentDayIndex(todayIdx >= 0 ? todayIdx : 0);
              }}
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
              No hay tareas esta semana
            </p>
            <p className="handwritten-note mt-1 text-base text-foreground-tertiary">
              Las asignaciones aparecerán aquí
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: 7-column grid calendar */}
            <div className="hidden sm:block">
              {/* Day-of-week header row */}
              <div
                className="grid grid-cols-7"
                style={{ borderBottom: "1.5px solid #d4d0c8" }}
              >
                {DAY_HEADER_LABELS.map((label, i) => {
                  const isWeekend = i >= 5;
                  const rotation = DAY_ROTATIONS[i] ?? 0;
                  return (
                    <div
                      key={label}
                      className={`handwritten-title py-2 text-center text-base tracking-wider ${
                        isWeekend
                          ? "text-foreground-tertiary"
                          : "text-foreground-secondary"
                      }`}
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        letterSpacing: "1px",
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

              {/* Day number row */}
              <div
                className="grid grid-cols-7"
                style={{ borderBottom: "1px solid #e8e4dc" }}
              >
                {dayData.map((day, i) => {
                  const isToday = isSameDay(day.date, today);
                  const dayNum = day.date.getDate();
                  const rotation = DAY_ROTATIONS[i] ?? 0;
                  return (
                    <div
                      key={day.date.toISOString()}
                      className={`flex justify-center py-1.5 ${i < 6 ? "" : ""}`}
                      style={{
                        borderRight: i < 6 ? "1px solid #e8e4dc" : "none",
                      }}
                    >
                      <span
                        className={`handwritten-note flex h-8 w-8 items-center justify-center text-xl font-semibold ${
                          isToday
                            ? "notebook-today-highlight rounded-full text-primary"
                            : "text-foreground-secondary"
                        }`}
                        style={{
                          transform: `rotate(${rotation * 1.5}deg)`,
                        }}
                      >
                        {dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Day content cells */}
              <div className="grid grid-cols-7">
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
                    isLast={i === 6}
                    variant="desktop"
                  />
                ))}
              </div>
            </div>

            {/* Mobile: single-day swipe view */}
            <div className="sm:hidden overflow-hidden">
              {/* Day dots indicator */}
              <div
                className="flex items-center justify-center gap-1 py-2"
                style={{ borderBottom: "1px dashed #e8e4dc" }}
              >
                {weekDays.map((day, index) => {
                  const isActive = index === currentDayIndex;
                  const isDayToday = isSameDay(day, today);
                  const dayEntry = dayData[index];
                  const hasTasks = dayEntry ? dayEntry.memberGroups.length > 0 : false;

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
                        {DAY_HEADER_LABELS[index] ?? ""}
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
                      {!hasTasks && !isActive && (
                        <div className="h-1 w-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Swipeable day content */}
              <div
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div
                  className={cn(
                    "day-slide-container",
                    dragOffset !== 0 && "day-slide-container--dragging",
                  )}
                  style={{
                    transform: `translateX(${dragOffset}px)`,
                  }}
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

      {/* Member legend — handwritten style */}
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
    </div>
  );
}
