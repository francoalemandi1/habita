import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { PlanPageClient } from "./plan-page-client";

import type { MemberType, WeeklyPlanStatus, TaskFrequency } from "@prisma/client";
import type { ExcludedTask } from "@/lib/plan-duration";

interface PlanAssignment {
  taskName: string;
  memberId: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
}

interface StoredPlan {
  id: string;
  status: WeeklyPlanStatus;
  balanceScore: number;
  notes: string[];
  assignments: PlanAssignment[];
  durationDays: number;
  excludedTasks: ExcludedTask[];
  createdAt: Date;
  appliedAt: Date | null;
  expiresAt: Date;
}

export default async function PlanPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const aiEnabled = isAIEnabled();

  if (!aiEnabled) {
    redirect("/my-tasks");
  }

  // Get members and tasks for the household
  const [members, tasks] = await Promise.all([
    prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true },
      include: {
        assignments: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          select: { id: true },
        },
      },
    }),
    prisma.task.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: {
        id: true,
        name: true,
        frequency: true,
        weight: true,
        estimatedMinutes: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Get active or pending plan
  const existingPlan = await prisma.weeklyPlan.findFirst({
    where: {
      householdId: member.householdId,
      status: { in: ["PENDING", "APPLIED"] },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  const memberSummaries = members.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.memberType,
    currentPending: m.assignments.length,
  }));

  // Transform the plan if it exists
  let storedPlan: StoredPlan | null = null;
  if (existingPlan) {
    const rawAssignments = existingPlan.assignments as unknown as Array<{
      taskName: string;
      memberId?: string;
      memberName: string;
      memberType: MemberType;
      reason: string;
    }>;

    // Backfill memberId for plans created before the memberId migration
    const memberByName = new Map(members.map((m) => [m.name.toLowerCase(), m.id]));
    const migratedAssignments: PlanAssignment[] = rawAssignments.map((a) => ({
      ...a,
      memberId: a.memberId ?? memberByName.get(a.memberName.toLowerCase()) ?? a.memberName,
    }));

    storedPlan = {
      id: existingPlan.id,
      status: existingPlan.status,
      balanceScore: existingPlan.balanceScore,
      notes: existingPlan.notes,
      assignments: migratedAssignments,
      durationDays: existingPlan.durationDays,
      excludedTasks: (existingPlan.excludedTasks as unknown as ExcludedTask[]) ?? [],
      createdAt: existingPlan.createdAt,
      appliedAt: existingPlan.appliedAt,
      expiresAt: existingPlan.expiresAt,
    };
  }

  return (
    <PlanPageClient
      householdId={member.householdId}
      members={memberSummaries}
      tasks={tasks}
      existingPlan={storedPlan}
    />
  );
}
