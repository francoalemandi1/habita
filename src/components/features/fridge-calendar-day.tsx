"use client";

import { formatDayHeader } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { cyclingColors, contrastText } from "@/lib/design-tokens";

import type { AssignmentStatus, MemberType, TaskFrequency } from "@prisma/client";

export interface CalendarAssignment {
  id: string;
  dueDate: string;
  status: AssignmentStatus;
  completedAt: string | null;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
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
  /** All household members — used to assign a stable color per member across days */
  allMembers: CalendarMember[];
  completingId: string | null;
  onComplete: (assignmentId: string) => void;
  onUncomplete: (assignmentId: string) => void;
  variant: "desktop" | "mobile";
  /** Whether this is the last column (no right border) — desktop only */
  isLast?: boolean;
}


/** Returns a stable color for a member based on their position in the global members list */
function getMemberColor(memberId: string, allMembers: CalendarMember[]): string {
  const index = allMembers.findIndex((m) => m.id === memberId);
  const safeIndex = index === -1 ? 0 : index;
  return cyclingColors[safeIndex % cyclingColors.length]!;
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

/** Deterministic micro-rotation from assignment/member ID for handwritten feel */
function microRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ((Math.abs(hash) % 7) - 3) * 0.1; // -0.3 to 0.3 degrees
}

export function FridgeCalendarDay({
  date,
  isToday,
  memberGroups,
  allMembers,
  completingId,
  onComplete,
  onUncomplete,
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
        allMembers={allMembers}
        completingId={completingId}
        onComplete={onComplete}
        onUncomplete={onUncomplete}
      />
    );
  }

  // Desktop: grid cell — notebook style
  return (
    <div
      className={cn(
        "min-h-[72px] p-1 notebook-ruled",
        isToday && "notebook-today-highlight",
      )}
      style={{
        borderBottom: "1px solid #e8e4dc",
        borderRight: isLast ? "none" : "1px solid #e8e4dc",
      }}
    >
      {isEmpty ? (
        <div className="flex h-full min-h-[56px] items-center justify-center">
          <span className="handwritten-note text-base text-foreground/15">-</span>
        </div>
      ) : (
        <div className="space-y-1">
          {memberGroups.map((group) => (
            <DesktopMemberGroup
              key={group.member.id}
              group={group}
              allMembers={allMembers}
              isOwnGroup
              completingId={completingId}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
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
  allMembers,
  isOwnGroup,
  completingId,
  onComplete,
  onUncomplete,
}: {
  group: MemberGroup;
  allMembers: CalendarMember[];
  isOwnGroup: boolean;
  completingId: string | null;
  onComplete: (assignmentId: string) => void;
  onUncomplete: (assignmentId: string) => void;
}) {
  const bgColor = getMemberColor(group.member.id, allMembers);
  const rotation = microRotation(group.member.id);

  return (
    <div
      className="rounded py-0.5 pl-1.5 pr-0.5"
      style={{
        backgroundColor: `${bgColor}12`,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* Member initial chip */}
      <div className="mb-0.5 flex items-center gap-1">
        <div
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold leading-none"
          style={{
            backgroundColor: bgColor,
            color: contrastText(bgColor),
          }}
        >
          {getInitial(group.member.name)}
        </div>
        <span className="handwritten-note truncate text-sm font-semibold text-foreground/60">
          {group.member.name.split(" ")[0] ?? group.member.name}
        </span>
      </div>

      {/* Tasks */}
      <div className="space-y-px">
        {group.assignments.map((assignment) => (
          <DesktopTaskRow
            key={assignment.id}
            assignment={assignment}
            canUncomplete={isOwnGroup}
            isCompleting={completingId === assignment.id}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
          />
        ))}
      </div>
    </div>
  );
}

/** Desktop: minimal task row — pen-strikethrough on completion */
function DesktopTaskRow({
  assignment,
  canUncomplete,
  isCompleting,
  onComplete,
  onUncomplete,
}: {
  assignment: CalendarAssignment;
  canUncomplete: boolean;
  isCompleting: boolean;
  onComplete: (assignmentId: string) => void;
  onUncomplete: (assignmentId: string) => void;
}) {
  const completed = isCompletedStatus(assignment.status);
  const pending = isPendingStatus(assignment.status);
  const overdue = assignment.status === "OVERDUE";
  const isInteractive = pending || overdue || (completed && canUncomplete);
  const rotation = microRotation(assignment.id);

  return (
    <button
      type="button"
      disabled={isCompleting || !isInteractive}
      onClick={() => {
        if (completed && canUncomplete) onUncomplete(assignment.id);
        else if (pending || overdue) onComplete(assignment.id);
      }}
      className={cn(
        "flex w-full items-center rounded py-px pl-0.5 text-left",
        isInteractive && "hover:bg-foreground/5 active:bg-foreground/8",
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <span
        className={cn(
          "handwritten-note truncate text-sm leading-tight",
          overdue && "text-destructive",
          isCompleting && "task-loading-pulse",
          !completed && !overdue && "text-foreground/65",
        )}
      >
        {assignment.suggestedStartTime && (
          <span className="text-[10px] text-foreground/40 mr-0.5">
            {assignment.suggestedStartTime}
          </span>
        )}
        <span
          className={cn(
            "task-strikethrough",
            completed && "task-strikethrough--active text-foreground/35",
          )}
        >
          {assignment.task.name}
        </span>
      </span>
    </button>
  );
}

/** Mobile: full-width day card */
function MobileDayCard({
  date,
  isToday,
  isEmpty,
  memberGroups,
  allMembers,
  completingId,
  onComplete,
  onUncomplete,
}: {
  date: Date;
  isToday: boolean;
  isEmpty: boolean;
  memberGroups: MemberGroup[];
  allMembers: CalendarMember[];
  completingId: string | null;
  onComplete: (assignmentId: string) => void;
  onUncomplete: (assignmentId: string) => void;
}) {
  const { dayName, dayNumber } = formatDayHeader(date);

  // Collapse empty days that aren't today on mobile
  if (isEmpty && !isToday) {
    return null;
  }

  return (
    <div
      className="px-3 py-2"
      style={{
        borderBottom: "1px solid #e8e4dc",
      }}
    >
      {/* Day header row */}
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={cn(
            "handwritten-note flex h-8 w-8 shrink-0 items-center justify-center text-xl font-bold",
            isToday
              ? "text-primary"
              : "text-foreground/50",
          )}
          style={{ transform: "rotate(-0.5deg)" }}
        >
          {dayNumber}
        </span>
        <div>
          <span
            className={cn(
              "handwritten-title text-base",
              isToday ? "text-primary" : "text-foreground/65",
            )}
          >
            {dayName}
          </span>
          {isToday && (
            <span className="handwritten-title ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              HOY
            </span>
          )}
        </div>
      </div>

      {/* Member groups */}
      {isEmpty ? (
        <p className="handwritten-note pb-1 pl-12 text-base text-foreground/25">
          Sin tareas
        </p>
      ) : (
        <div className="space-y-1.5 pl-0.5">
          {memberGroups.map((group) => (
            <MobileMemberGroup
              key={group.member.id}
              group={group}
              allMembers={allMembers}
              isOwnGroup
              completingId={completingId}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
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
  allMembers,
  isOwnGroup,
  completingId,
  onComplete,
  onUncomplete,
}: {
  group: MemberGroup;
  allMembers: CalendarMember[];
  isOwnGroup: boolean;
  completingId: string | null;
  onComplete: (assignmentId: string) => void;
  onUncomplete: (assignmentId: string) => void;
}) {
  const bgColor = getMemberColor(group.member.id, allMembers);
  const firstName = group.member.name.split(" ")[0] ?? group.member.name;

  const totalTasks = group.assignments.length;
  const doneTasks = group.assignments.filter(
    (a) => isCompletedStatus(a.status),
  ).length;

  return (
    <div
      className="rounded-lg py-1.5 pl-2.5 pr-1.5"
      style={{
        backgroundColor: `${bgColor}10`,
        border: `1px solid ${bgColor}20`,
      }}
    >
      {/* Member header */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: bgColor,
              color: contrastText(bgColor),
              boxShadow: `0 1px 4px ${bgColor}30`,
            }}
          >
            {getInitial(group.member.name)}
          </div>
          <span className="handwritten-title text-base text-foreground/70">
            {firstName}
          </span>
        </div>
        {totalTasks > 1 && (
          <span className="handwritten-note text-sm tabular-nums text-foreground/35">
            {doneTasks}/{totalTasks}
          </span>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-0.5 pl-7">
        {group.assignments.map((assignment) => (
          <MobileTaskRow
            key={assignment.id}
            assignment={assignment}
            canUncomplete={isOwnGroup}
            isCompleting={completingId === assignment.id}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
          />
        ))}
      </div>
    </div>
  );
}

/** Mobile: task row — pen-strikethrough on completion */
function MobileTaskRow({
  assignment,
  canUncomplete,
  isCompleting,
  onComplete,
  onUncomplete,
}: {
  assignment: CalendarAssignment;
  canUncomplete: boolean;
  isCompleting: boolean;
  onComplete: (assignmentId: string) => void;
  onUncomplete: (assignmentId: string) => void;
}) {
  const completed = isCompletedStatus(assignment.status);
  const pending = isPendingStatus(assignment.status);
  const overdue = assignment.status === "OVERDUE";
  const isInteractive = pending || overdue || (completed && canUncomplete);
  const rotation = microRotation(assignment.id);

  return (
    <button
      type="button"
      disabled={isCompleting || !isInteractive}
      onClick={() => {
        if (completed && canUncomplete) onUncomplete(assignment.id);
        else if (pending || overdue) onComplete(assignment.id);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg py-1 text-left transition-colors",
        isInteractive && "active:bg-foreground/5",
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <span
        className={cn(
          "handwritten-note flex-1 truncate text-base leading-snug",
          overdue && "text-destructive",
          isCompleting && "task-loading-pulse",
          !completed && !overdue && "text-foreground/70",
        )}
      >
        {assignment.suggestedStartTime && (
          <span className="text-xs text-foreground/40 mr-1">
            {assignment.suggestedStartTime}
          </span>
        )}
        <span
          className={cn(
            "task-strikethrough",
            completed && "task-strikethrough--active text-foreground/35",
          )}
        >
          {assignment.task.name}
        </span>
      </span>

      {overdue && (
        <span className="handwritten-note shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">
          !
        </span>
      )}
    </button>
  );
}
