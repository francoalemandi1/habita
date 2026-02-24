"use client";

import { useState } from "react";
import { ClipboardList, CalendarDays, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FridgeCalendarView } from "@/components/features/fridge-calendar-view";
import { MyAssignmentsList } from "@/components/features/my-assignments-list";
import { PendingTransfers } from "@/components/features/pending-transfers";
import { cn } from "@/lib/utils";
import { spacing } from "@/lib/design-tokens";

import type { Assignment, Task } from "@prisma/client";
import type { CalendarAssignment, CalendarMember } from "@/components/features/fridge-calendar-day";

type ViewMode = "list" | "calendar";

interface AssignmentWithTask extends Assignment {
  task: Pick<Task, "id" | "name" | "description" | "weight" | "frequency" | "estimatedMinutes">;
}

interface Transfer {
  id: string;
  reason: string | null;
  status: string;
  requestedAt: Date | string;
  assignment: {
    task: { id: string; name: string };
  };
  fromMember: { id: string; name: string };
  toMember: { id: string; name: string };
}

interface MyTasksPageClientProps {
  assignments: AssignmentWithTask[];
  completedAssignments: AssignmentWithTask[];
  members: Array<{ id: string; name: string }>;
  currentMemberId: string;
  completedToday: number;
  totalCompleted: number;
  showPlanCta: boolean;
  transfers: Transfer[];
  pendingCount: number;
  calendarAssignments: CalendarAssignment[];
  calendarMembers: CalendarMember[];
  initialWeekStart: string;
  isSolo?: boolean;
}

export function MyTasksPageClient({
  assignments,
  completedAssignments,
  members,
  currentMemberId,
  completedToday,
  totalCompleted,
  showPlanCta,
  transfers,
  pendingCount,
  calendarAssignments,
  calendarMembers,
  initialWeekStart,
  isSolo = false,
}: MyTasksPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  return (
    <>
      <div className={spacing.pageHeader}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary shrink-0" />
            Mis tareas
          </h1>
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "h-8 px-2.5 rounded-md",
                viewMode === "calendar" && "bg-background shadow-sm"
              )}
              aria-label="Vista calendario"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 px-2.5 rounded-md",
                viewMode === "list" && "bg-background shadow-sm"
              )}
              aria-label="Vista lista"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {viewMode === "list" && (
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingCount} pendientes · {completedToday} completadas hoy
          </p>
        )}
      </div>

      {viewMode === "list" ? (
        <>
          <div className={spacing.sectionGapLg}>
            <PendingTransfers transfers={transfers} currentMemberId={currentMemberId} />
          </div>

          <MyAssignmentsList
            assignments={assignments}
            completedAssignments={completedAssignments}
            members={members}
            currentMemberId={currentMemberId}
            completedToday={completedToday}
            totalCompleted={totalCompleted}
            showPlanCta={showPlanCta}
            isSolo={isSolo}
          />
        </>
      ) : (
        <FridgeCalendarView
          initialAssignments={calendarAssignments}
          members={calendarMembers}
          initialWeekStart={initialWeekStart}
        />
      )}
    </>
  );
}
