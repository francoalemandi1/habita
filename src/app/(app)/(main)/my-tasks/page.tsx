import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { getWeekMonday, getWeekSunday } from "@/lib/calendar-utils";
import { MyTasksPageClient } from "@/components/features/my-tasks-page-client";

export default async function MyTasksPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const monday = getWeekMonday(now);
  const sunday = getWeekSunday(monday);

  const [assignments, completedTodayAssignments, completedToday, totalCompleted, transfers, householdMembers, calendarAssignments, calendarMembers] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        memberId: member.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lte: endOfToday },
        NOT: {
          transfers: {
            some: {
              fromMemberId: member.id,
              status: { in: ["PENDING", "ACCEPTED"] },
            },
          },
        },
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            weight: true,
            frequency: true,
            estimatedMinutes: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    }),
    prisma.assignment.findMany({
      where: {
        memberId: member.id,
        status: { in: ["COMPLETED", "VERIFIED"] },
        completedAt: { gte: todayStart },
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            weight: true,
            frequency: true,
            estimatedMinutes: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    }),
    prisma.assignment.count({
      where: {
        memberId: member.id,
        status: { in: ["COMPLETED", "VERIFIED"] },
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.assignment.count({
      where: {
        memberId: member.id,
        status: { in: ["COMPLETED", "VERIFIED"] },
      },
    }),
    prisma.taskTransfer.findMany({
      where: {
        OR: [{ fromMemberId: member.id }, { toMemberId: member.id }],
        assignment: {
          householdId: member.householdId,
        },
      },
      include: {
        assignment: {
          include: {
            task: { select: { id: true, name: true } },
          },
        },
        fromMember: { select: { id: true, name: true } },
        toMember: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.member.findMany({
      where: {
        householdId: member.householdId,
        isActive: true,
      },
      select: { id: true, name: true },
    }),
    prisma.assignment.findMany({
      where: {
        householdId: member.householdId,
        dueDate: { gte: monday, lte: sunday },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        dueDate: true,
        status: true,
        completedAt: true,
        suggestedStartTime: true,
        suggestedEndTime: true,
        task: {
          select: { id: true, name: true, weight: true, frequency: true, estimatedMinutes: true },
        },
        member: {
          select: { id: true, name: true, memberType: true, avatarUrl: true },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: { id: true, name: true, memberType: true, avatarUrl: true },
    }),
  ]);

  // Check if user can generate a new plan (AI enabled + no active plan)
  const aiEnabled = isAIEnabled();
  const activePlan = aiEnabled
    ? await prisma.weeklyPlan.findFirst({
        where: {
          householdId: member.householdId,
          status: { in: ["PENDING", "APPLIED"] },
          expiresAt: { gt: now },
        },
        select: { id: true },
      })
    : null;
  const showPlanCta = aiEnabled && !activePlan;

  const serializedCalendarAssignments = calendarAssignments.map((a) => ({
    ...a,
    dueDate: a.dueDate.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
  }));

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <MyTasksPageClient
        assignments={assignments}
        completedAssignments={completedTodayAssignments}
        members={householdMembers}
        currentMemberId={member.id}
        completedToday={completedToday}
        totalCompleted={totalCompleted}
        showPlanCta={showPlanCta}
        transfers={transfers}
        pendingCount={assignments.length}
        calendarAssignments={serializedCalendarAssignments}
        calendarMembers={calendarMembers}
        initialWeekStart={monday.toISOString()}
      />
    </div>
  );
}
