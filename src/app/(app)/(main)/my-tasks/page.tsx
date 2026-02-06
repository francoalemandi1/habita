import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { MyAssignmentsList } from "@/components/features/my-assignments-list";
import { PendingTransfers } from "@/components/features/pending-transfers";
import { WeeklyCelebrationWrapper } from "@/components/features/weekly-celebration-wrapper";
import { PlanStatusCard } from "@/components/features/plan-status-card";
import { UpcomingTasksCard } from "@/components/features/upcoming-tasks-card";

import type { MemberType, TaskFrequency } from "@prisma/client";

export default async function MyTasksPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  // Calculate start of week (Sunday)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [assignments, completedToday, completedThisWeek, totalCompleted, transfers, householdMembers, activePlan] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        memberId: member.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
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
        completedAt: { gte: startOfWeek },
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
    prisma.weeklyPlan.findFirst({
      where: {
        householdId: member.householdId,
        status: { in: ["PENDING", "APPLIED"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Show celebration if no pending tasks and completed at least 1 this week
  const showCelebration = assignments.length === 0 && completedThisWeek > 0;
  const aiEnabled = isAIEnabled();

  // Transform plan for the status card
  const planForCard = activePlan
    ? {
        id: activePlan.id,
        status: activePlan.status,
        balanceScore: activePlan.balanceScore,
        assignments: activePlan.assignments as Array<{
          taskName: string;
          memberName: string;
          memberType: MemberType;
          reason: string;
        }>,
        durationDays: activePlan.durationDays,
        createdAt: activePlan.createdAt,
        appliedAt: activePlan.appliedAt,
        expiresAt: activePlan.expiresAt,
      }
    : null;

  // Extract excluded tasks from active plan
  const excludedTasks = (activePlan?.excludedTasks as Array<{ taskName: string; frequency: TaskFrequency }>) ?? [];

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis tareas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {assignments.length} pendientes · {completedToday} completadas hoy
            </p>
          </div>
        </div>
      </div>

      {/* Plan status card */}
      <div className="mb-6">
        <PlanStatusCard plan={planForCard} aiEnabled={aiEnabled} />
      </div>

      {/* Celebration when all tasks complete */}
      {showCelebration && (
        <div className="mb-8">
          <WeeklyCelebrationWrapper
            weeklyCompleted={completedThisWeek}
            totalCompleted={totalCompleted}
          />
        </div>
      )}

      {/* Pending Transfers */}
      <div className="mb-8">
        <PendingTransfers transfers={transfers} currentMemberId={member.id} />
      </div>

      <MyAssignmentsList
        assignments={assignments}
        members={householdMembers}
        currentMemberId={member.id}
      />

      {/* Upcoming tasks excluded from current plan */}
      {excludedTasks.length > 0 && (
        <div className="mt-8">
          <UpcomingTasksCard excludedTasks={excludedTasks} />
        </div>
      )}
    </div>
  );
}
