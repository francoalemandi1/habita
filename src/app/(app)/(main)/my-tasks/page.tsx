import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { MyAssignmentsList } from "@/components/features/my-assignments-list";
import { PendingTransfers } from "@/components/features/pending-transfers";
import { WeeklyCelebrationWrapper } from "@/components/features/weekly-celebration-wrapper";
import { ClipboardList } from "lucide-react";

export default async function MyTasksPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  // Calculate start of week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const [assignments, completedToday, completedThisWeek, totalCompleted, transfers, householdMembers, completedLastWeek] = await Promise.all([
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
    prisma.assignment.count({
      where: {
        memberId: member.id,
        status: { in: ["COMPLETED", "VERIFIED"] },
        completedAt: { gte: startOfLastWeek, lt: startOfWeek },
      },
    }),
  ]);

  const weeklyImprovement = completedThisWeek > completedLastWeek && completedLastWeek > 0
    ? completedThisWeek - completedLastWeek
    : 0;

  // Show celebration if no pending tasks and completed at least 1 this week
  const showCelebration = assignments.length === 0 && completedThisWeek > 0;

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

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary shrink-0" />
          Mis tareas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {assignments.length} pendientes · {completedToday} completadas hoy
        </p>
        {weeklyImprovement > 0 && (
          <p className="mt-0.5 text-xs font-medium text-[var(--color-success)]">
            ↑ {weeklyImprovement} más que la semana pasada
          </p>
        )}
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
        completedToday={completedToday}
        totalCompleted={totalCompleted}
        showPlanCta={showPlanCta}
      />
    </div>
  );
}
