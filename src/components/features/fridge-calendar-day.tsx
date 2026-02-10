"use client";

import { Check, Loader2, AlertTriangle, Square, SquareCheck } from "lucide-react";
import { formatDayHeader } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

import type { AssignmentStatus, MemberType, TaskFrequency } from "@prisma/client";

export interface CalendarAssignment {
  id: string;
  dueDate: string;
  status: AssignmentStatus;
  completedAt: string | null;
  task: {
    id: string;
    name: string;
    weight: number;
    frequency: TaskFrequency;
    estimatedMinutes: number | null;
  };
  member: {
    id: string;
    name: string;
    memberType: MemberType;
    avatarUrl: string | null;
  };
}

export interface CalendarMember {
  id: string;
  name: string;
  memberType: MemberType;
  avatarUrl: string | null;
}

interface MemberGroup {
  member: CalendarMember;
  assignments: CalendarAssignment[];
}

interface FridgeCalendarDayProps {
  date: Date;
  isToday: boolean;
  memberGroups: MemberGroup[];
  completingId: string | null;
  onComplete: (assignmentId: string) => void;
  variant: "desktop" | "mobile";
  /** Whether this is the last column (no right border) — desktop only */
  isLast?: boolean;
}

const MEMBER_COLORS = ["#5260fe", "#d2ffa0", "#d0b6ff", "#ff9f43", "#ff6b6b", "#54a0ff"];

function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]!;
}

function getInitial(name: string): string {
  return (name[0] ?? "?").toUpperCase();
}

function isCompletedStatus(status: AssignmentStatus): boolean {
  return status === "COMPLETED" || status === "VERIFIED";
}

function isPendingStatus(status: AssignmentStatus): boolean {
  return status === "PENDING" || status === "IN_PROGRESS";
}

export function FridgeCalendarDay({
  date,
  isToday,
  memberGroups,
  completingId,
  onComplete,
  variant,
  isLast = false,
}: FridgeCalendarDayProps) {
  const isEmpty = memberGroups.length === 0;

  if (variant === "mobile") {
    return (
      <MobileDayCard
        date={date}
        isToday={isToday}
        isEmpty={isEmpty}
        memberGroups={memberGroups}
        completingId={completingId}
        onComplete={onComplete}
      />
    );
  }

  // Desktop: grid cell
  return (
    <div
      className={cn(
        "min-h-[100px] border-b border-border/15 p-1.5",
        !isLast && "border-r border-r-border/15",
        isToday && "bg-primary/3",
      )}
    >
      {isEmpty ? (
        <div className="flex h-full min-h-[80px] items-center justify-center">
          <span className="text-[10px] text-muted-foreground/25">-</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {memberGroups.map((group, memberIndex) => (
            <DesktopMemberGroup
              key={group.member.id}
              group={group}
              memberIndex={memberIndex}
              completingId={completingId}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Desktop: compact member group inside a grid cell */
function DesktopMemberGroup({
  group,
  memberIndex,
  completingId,
  onComplete,
}: {
  group: MemberGroup;
  memberIndex: number;
  completingId: string | null;
  onComplete: (assignmentId: string) => void;
}) {
  const bgColor = getMemberColor(memberIndex);
  const isLightBg = bgColor === "#d2ffa0" || bgColor === "#d0b6ff" || bgColor === "#ffd32a";

  return (
    <div
      className="rounded-md border-l-[3px] py-0.5 pl-1.5 pr-0.5"
      style={{
        borderLeftColor: bgColor,
        backgroundColor: `${bgColor}08`,
      }}
    >
      {/* Member initial chip */}
      <div className="mb-0.5 flex items-center gap-1">
        <div
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold leading-none"
          style={{
            backgroundColor: bgColor,
            color: isLightBg ? "#272727" : "#ffffff",
          }}
        >
          {getInitial(group.member.name)}
        </div>
        <span className="truncate text-[10px] font-semibold text-foreground/70">
          {group.member.name.split(" ")[0] ?? group.member.name}
        </span>
      </div>

      {/* Tasks */}
      <div className="space-y-px">
        {group.assignments.map((assignment) => (
          <DesktopTaskRow
            key={assignment.id}
            assignment={assignment}
            isCompleting={completingId === assignment.id}
            onComplete={onComplete}
          />
        ))}
      </div>
    </div>
  );
}

/** Desktop: minimal task row */
function DesktopTaskRow({
  assignment,
  isCompleting,
  onComplete,
}: {
  assignment: CalendarAssignment;
  isCompleting: boolean;
  onComplete: (assignmentId: string) => void;
}) {
  const completed = isCompletedStatus(assignment.status);
  const pending = isPendingStatus(assignment.status);
  const overdue = assignment.status === "OVERDUE";

  return (
    <div className="group flex items-center gap-1 rounded py-px pl-0.5">
      {isCompleting ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
      ) : completed ? (
        <SquareCheck className="h-3 w-3 shrink-0 text-green-500" />
      ) : overdue ? (
        <button
          type="button"
          onClick={() => onComplete(assignment.id)}
          className="shrink-0 transition-transform hover:scale-110 active:scale-95"
        >
          <AlertTriangle className="h-3 w-3 text-destructive" />
        </button>
      ) : pending ? (
        <button
          type="button"
          onClick={() => onComplete(assignment.id)}
          className="shrink-0 text-muted-foreground/30 transition-all hover:text-primary active:scale-95"
        >
          <Square className="h-3 w-3" />
        </button>
      ) : (
        <Square className="h-3 w-3 shrink-0 text-muted-foreground/15" />
      )}

      <span
        className={cn(
          "truncate text-[10px] leading-tight",
          completed && "text-muted-foreground/50 line-through",
          overdue && "font-medium text-destructive",
          !completed && !overdue && "text-foreground/70",
        )}
      >
        {assignment.task.name}
      </span>
    </div>
  );
}

/** Mobile: full-width day card */
function MobileDayCard({
  date,
  isToday,
  isEmpty,
  memberGroups,
  completingId,
  onComplete,
}: {
  date: Date;
  isToday: boolean;
  isEmpty: boolean;
  memberGroups: MemberGroup[];
  completingId: string | null;
  onComplete: (assignmentId: string) => void;
}) {
  const { dayName, dayNumber } = formatDayHeader(date);

  // Collapse empty days that aren't today on mobile
  if (isEmpty && !isToday) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-b border-border/20 px-4 py-3",
        isToday && "bg-primary/4",
      )}
    >
      {/* Day header row */}
      <div className="mb-2 flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
            isToday
              ? "bg-primary text-white shadow-sm"
              : "bg-muted/50 text-foreground/60",
          )}
        >
          {dayNumber}
        </div>
        <div>
          <span
            className={cn(
              "text-sm font-semibold",
              isToday ? "text-primary" : "text-foreground/80",
            )}
          >
            {dayName}
          </span>
          {isToday && (
            <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              HOY
            </span>
          )}
        </div>
      </div>

      {/* Member groups */}
      {isEmpty ? (
        <p className="pb-1 pl-11 text-xs text-muted-foreground/40">
          Sin tareas
        </p>
      ) : (
        <div className="space-y-2.5 pl-0.5">
          {memberGroups.map((group, memberIndex) => (
            <MobileMemberGroup
              key={group.member.id}
              group={group}
              memberIndex={memberIndex}
              completingId={completingId}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Mobile: member group with tasks */
function MobileMemberGroup({
  group,
  memberIndex,
  completingId,
  onComplete,
}: {
  group: MemberGroup;
  memberIndex: number;
  completingId: string | null;
  onComplete: (assignmentId: string) => void;
}) {
  const bgColor = getMemberColor(memberIndex);
  const isLightBg = bgColor === "#d2ffa0" || bgColor === "#d0b6ff" || bgColor === "#ffd32a";
  const firstName = group.member.name.split(" ")[0] ?? group.member.name;

  const totalTasks = group.assignments.length;
  const doneTasks = group.assignments.filter(
    (a) => isCompletedStatus(a.status),
  ).length;

  return (
    <div
      className="rounded-xl border-l-[3px] bg-card/80 py-2 pl-3 pr-2 shadow-sm"
      style={{
        borderLeftColor: bgColor,
      }}
    >
      {/* Member header */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: bgColor,
              color: isLightBg ? "#272727" : "#ffffff",
              boxShadow: `0 1px 4px ${bgColor}30`,
            }}
          >
            {getInitial(group.member.name)}
          </div>
          <span className="text-sm font-semibold text-foreground/80">
            {firstName}
          </span>
        </div>
        {totalTasks > 1 && (
          <span className="text-[10px] tabular-nums text-muted-foreground/50">
            {doneTasks}/{totalTasks}
          </span>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-1 pl-8">
        {group.assignments.map((assignment) => (
          <MobileTaskRow
            key={assignment.id}
            assignment={assignment}
            isCompleting={completingId === assignment.id}
            onComplete={onComplete}
          />
        ))}
      </div>
    </div>
  );
}

/** Mobile: task row with bigger touch targets */
function MobileTaskRow({
  assignment,
  isCompleting,
  onComplete,
}: {
  assignment: CalendarAssignment;
  isCompleting: boolean;
  onComplete: (assignmentId: string) => void;
}) {
  const completed = isCompletedStatus(assignment.status);
  const pending = isPendingStatus(assignment.status);
  const overdue = assignment.status === "OVERDUE";

  return (
    <button
      type="button"
      disabled={completed || isCompleting || (!pending && !overdue)}
      onClick={() => {
        if (pending || overdue) onComplete(assignment.id);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg py-1 text-left transition-colors",
        (pending || overdue) && "active:bg-muted/30",
      )}
    >
      {/* Checkbox-style indicator */}
      {isCompleting ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      ) : completed ? (
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-500/90">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
      ) : overdue ? (
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-destructive/60">
          <AlertTriangle className="h-2.5 w-2.5 text-destructive" />
        </div>
      ) : pending ? (
        <div className="h-4 w-4 shrink-0 rounded border-2 border-muted-foreground/25 transition-colors group-active:border-primary" />
      ) : (
        <div className="h-4 w-4 shrink-0 rounded border-2 border-muted-foreground/10" />
      )}

      {/* Task name */}
      <span
        className={cn(
          "flex-1 truncate text-[13px] leading-snug",
          completed && "text-muted-foreground/50 line-through",
          overdue && "font-medium text-destructive",
          !completed && !overdue && "text-foreground/80",
        )}
      >
        {assignment.task.name}
      </span>

      {/* Weight badge for overdue */}
      {overdue && (
        <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
          !
        </span>
      )}
    </button>
  );
}
