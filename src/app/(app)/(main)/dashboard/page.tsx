import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCards } from "@/components/features/stats-cards";
import { SuggestionsCard } from "@/components/features/suggestions-card";
import { PlanStatusCard } from "@/components/features/plan-status-card";
import { CopyButton } from "@/components/ui/copy-button";
import { UserPlus, Trophy } from "lucide-react";

import type { MemberType } from "@prisma/client";

export default async function DashboardPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;
  const now = new Date();

  // Get all members
  const members = await prisma.member.findMany({
    where: { householdId, isActive: true },
  });

  // Get totals
  const [totalCompleted, pendingCount, overdueCount] = await Promise.all([
    prisma.assignment.count({
      where: { householdId, status: { in: ["COMPLETED", "VERIFIED"] } },
    }),
    prisma.assignment.count({
      where: { householdId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    }),
    prisma.assignment.count({
      where: {
        householdId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: now },
      },
    }),
  ]);

  // Recent achievements (last 7 days, any member in household)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentAchievements = await prisma.memberAchievement.findMany({
    where: {
      member: { householdId },
      unlockedAt: { gte: sevenDaysAgo },
    },
    include: {
      achievement: { select: { name: true } },
      member: { select: { name: true } },
    },
    orderBy: { unlockedAt: "desc" },
    take: 3,
  });

  // Get active plan for this household
  const activePlan = await prisma.weeklyPlan.findFirst({
    where: {
      householdId,
      status: { in: ["PENDING", "APPLIED"] },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  const aiEnabled = isAIEnabled();

  return (
    <div className="container max-w-6xl px-4 py-6 sm:py-8">
      {/* Header: hogar + código */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{member.household.name}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          Código: <code className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs font-semibold">{member.household.inviteCode}</code>
          <CopyButton value={member.household.inviteCode} />
        </p>
      </div>

      {/* Invite banner - when only 1 member */}
      {members.length === 1 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <UserPlus className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="font-medium">¡Invitá a los miembros de tu hogar!</p>
              <p className="text-sm text-muted-foreground">
                Compartí el código <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{member.household.inviteCode}</code> para que se unan y puedan repartir las tareas.
              </p>
            </div>
            <CopyButton value={member.household.inviteCode} />
          </CardContent>
        </Card>
      )}

      {/* Suggestions Card - Priority placement */}
      <div className="mb-6">
        <SuggestionsCard />
      </div>

      {/* Plan Status Card */}
      {aiEnabled && (
        <div className="mb-6">
          <PlanStatusCard
            plan={activePlan ? {
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
            } : null}
            aiEnabled={aiEnabled}
          />
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 sm:mb-8">
        <StatsCards
          completed={totalCompleted}
          pending={pendingCount}
          overdue={overdueCount}
          members={members.length}
        />
      </div>

      {/* Recent achievements */}
      {recentAchievements.length > 0 && (
        <div className="mb-6">
          <Card className="border-[var(--color-xp)]/20 bg-[var(--color-xp)]/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-yellow-500" />
                <span className="text-sm font-medium">
                  {recentAchievements[0]!.member.name} desbloqueó: {recentAchievements[0]!.achievement.name}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
