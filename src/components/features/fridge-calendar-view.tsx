"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react";
import { FridgeCalendarDay } from "@/components/features/fridge-calendar-day";
import { BackButton } from "@/components/ui/back-button";
import { apiFetch } from "@/lib/api-client";
import {
  getWeekMonday,
  getWeekSunday,
  getWeekDays,
  formatWeekRange,
  isSameDay,
} from "@/lib/calendar-utils";

import type { CalendarAssignment, CalendarMember } from "@/components/features/fridge-calendar-day";

interface FridgeCalendarViewProps {
  initialAssignments: CalendarAssignment[];
  members: CalendarMember[];
  currentMemberId: string;
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

    return {
      date: day,
      memberGroups: Array.from(memberMap.values()),
    };
  });
}

export function FridgeCalendarView({
  initialAssignments,
  members,
  currentMemberId,
  initialWeekStart,
}: FridgeCalendarViewProps) {
  const [weekStart, setWeekStart] = useState(
    () => new Date(initialWeekStart),
  );
  const [assignments, setAssignments] =
    useState<CalendarAssignment[]>(initialAssignments);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <BackButton />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary shrink-0" />
          Calendario semanal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {weekStats.total > 0
            ? `${weekStats.completed}/${weekStats.total} tareas completadas esta semana`
            : "Vista de la semana del hogar"}
        </p>
      </div>

      {/* Fridge calendar "paper" container */}
      <div
        className="relative overflow-hidden rounded-2xl border border-border/40 bg-white shadow-lg dark:bg-card"
        style={{
          boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Decorative top bar — like the metal strip on a fridge calendar */}
        <div className="relative flex items-center justify-between bg-linear-to-r from-primary via-primary/90 to-primary px-4 py-3 sm:px-6 sm:py-4">
          {/* Left nav */}
          <button
            type="button"
            onClick={() => navigateWeek(-1)}
            disabled={isLoadingWeek}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-all hover:bg-white/30 active:scale-95 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Center: month + week range */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-2">
              {isLoadingWeek && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />
              )}
              <span className="text-sm font-bold tracking-wide text-white sm:text-base">
                {weekLabel}
              </span>
            </div>
            {weekStats.total > 0 && (
              <span className="text-[11px] text-white/70">
                {weekStats.completed}/{weekStats.total} completadas
              </span>
            )}
          </div>

          {/* Right nav */}
          <button
            type="button"
            onClick={() => navigateWeek(1)}
            disabled={isLoadingWeek}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-all hover:bg-white/30 active:scale-95 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Decorative "pin" holes */}
          <div className="absolute left-6 top-0 h-3 w-3 rounded-b-full bg-background/20 sm:left-10" />
          <div className="absolute right-6 top-0 h-3 w-3 rounded-b-full bg-background/20 sm:right-10" />
        </div>

        {/* "Ir a hoy" strip */}
        {!isCurrentWeek && (
          <div className="flex justify-center border-b border-border/30 bg-primary/5 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded-full px-3 text-[11px] font-semibold text-primary hover:bg-primary/10"
              onClick={() => {
                const todayMonday = getWeekMonday(new Date());
                setWeekStart(todayMonday);
                setAssignments(initialAssignments);
              }}
            >
              Ir a hoy
            </Button>
          </div>
        )}

        {/* Calendar body */}
        {!hasAnyAssignments && !isLoadingWeek ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40">
              <span className="text-3xl">📋</span>
            </div>
            <p className="font-semibold text-muted-foreground">
              No hay tareas esta semana
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Las asignaciones aparecerán aquí
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: 7-column grid calendar */}
            <div className="hidden sm:block">
              {/* Day-of-week header row */}
              <div className="grid grid-cols-7 border-b border-border/30">
                {DAY_HEADER_LABELS.map((label, i) => {
                  const isWeekend = i >= 5;
                  return (
                    <div
                      key={label}
                      className={`py-2 text-center text-[11px] font-bold uppercase tracking-wider ${
                        isWeekend
                          ? "text-muted-foreground/50"
                          : "text-muted-foreground/70"
                      }`}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

              {/* Day number row */}
              <div className="grid grid-cols-7 border-b border-border/20">
                {dayData.map((day, i) => {
                  const isToday = isSameDay(day.date, today);
                  const dayNum = day.date.getDate();
                  return (
                    <div
                      key={day.date.toISOString()}
                      className={`flex justify-center py-1.5 ${i < 6 ? "border-r border-border/15" : ""}`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                          isToday
                            ? "bg-primary text-white shadow-sm"
                            : "text-foreground/80"
                        }`}
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
                    completingId={completingId}
                    onComplete={handleComplete}
                    isLast={i === 6}
                    variant="desktop"
                  />
                ))}
              </div>
            </div>

            {/* Mobile: stacked day cards */}
            <div className="space-y-0 sm:hidden">
              {dayData.map((day) => (
                <FridgeCalendarDay
                  key={day.date.toISOString()}
                  date={day.date}
                  isToday={isSameDay(day.date, today)}
                  memberGroups={day.memberGroups}
                  completingId={completingId}
                  onComplete={handleComplete}
                  variant="mobile"
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Member legend — shows who's who with their colors */}
      {members.length > 0 && hasAnyAssignments && (
        <div className="flex flex-wrap items-center justify-center gap-3 px-2">
          {members.map((member, i) => {
            const colors = ["#5260fe", "#d2ffa0", "#d0b6ff", "#ff9f43", "#ff6b6b", "#54a0ff"];
            const bgColor = colors[i % colors.length]!;
            const isLightBg = bgColor === "#d2ffa0" || bgColor === "#d0b6ff" || bgColor === "#ffd32a";
            const firstName = member.name.split(" ")[0] ?? member.name;

            return (
              <div key={member.id} className="flex items-center gap-1.5">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{
                    backgroundColor: bgColor,
                    color: isLightBg ? "#272727" : "#ffffff",
                    boxShadow: `0 1px 3px ${bgColor}40`,
                  }}
                >
                  {(member.name[0] ?? "?").toUpperCase()}
                </div>
                <span className="text-xs text-muted-foreground">{firstName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
