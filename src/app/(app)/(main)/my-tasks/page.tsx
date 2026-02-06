import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MyAssignmentsList } from "@/components/features/my-assignments-list";
import { PendingTransfers } from "@/components/features/pending-transfers";
import { WeeklyCelebrationWrapper } from "@/components/features/weekly-celebration-wrapper";

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

  const [assignments, completedToday, completedThisWeek, totalCompleted, transfers, householdMembers] = await Promise.all([
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
  ]);

  // Weekly comparison: only show positive improvement
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const completedLastWeek = await prisma.assignment.count({
    where: {
      memberId: member.id,
      status: { in: ["COMPLETED", "VERIFIED"] },
      completedAt: { gte: startOfLastWeek, lt: startOfWeek },
    },
  });

  const weeklyImprovement = completedThisWeek > completedLastWeek && completedLastWeek > 0
    ? completedThisWeek - completedLastWeek
    : 0;

  // Show celebration if no pending tasks and completed at least 1 this week
  const showCelebration = assignments.length === 0 && completedThisWeek > 0;

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Mis tareas</h1>
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
      />
    </div>
  );
}
