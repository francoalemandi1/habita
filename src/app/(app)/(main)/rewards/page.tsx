import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaderboard } from "@/components/features/leaderboard";
import { PlanRewardsSection } from "@/components/features/plan-rewards-section";
import { Coins } from "lucide-react";

import type { MemberType } from "@prisma/client";

interface LeaderboardMember {
  id: string;
  name: string;
  memberType: MemberType;
  level: number;
  xp: number;
  weeklyTasks: number;
  monthlyTasks: number;
  totalTasks: number;
}

export default async function RewardsPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const aiEnabled = isAIEnabled();

  // Get the most recent APPLIED plan
  const latestPlan = await prisma.weeklyPlan.findFirst({
    where: {
      householdId: member.householdId,
      status: "APPLIED",
    },
    orderBy: { createdAt: "desc" },
  });

  // Get AI-generated rewards for the latest plan (or all recent ones)
  const aiRewards = await prisma.householdReward.findMany({
    where: {
      householdId: member.householdId,
      isAiGenerated: true,
      ...(latestPlan ? { planId: latestPlan.id } : {}),
    },
    orderBy: { completionRate: "desc" },
  });

  // Also get any past AI rewards (from expired plans) for history
  const pastRewards = await prisma.householdReward.findMany({
    where: {
      householdId: member.householdId,
      isAiGenerated: true,
      ...(latestPlan ? { planId: { not: latestPlan.id } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get household members with levels for leaderboard
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const allMembers = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    include: { level: true },
  });

  const [weeklyCompletions, monthlyCompletions, totalCompletions] = await Promise.all([
    prisma.assignment.groupBy({
      by: ["memberId"],
      where: {
        householdId: member.householdId,
        status: { in: ["COMPLETED", "VERIFIED"] },
        completedAt: { gte: startOfWeek },
      },
      _count: { id: true },
    }),
    prisma.assignment.groupBy({
      by: ["memberId"],
      where: {
        householdId: member.householdId,
        status: { in: ["COMPLETED", "VERIFIED"] },
        completedAt: { gte: startOfMonth },
      },
      _count: { id: true },
    }),
    prisma.assignment.groupBy({
      by: ["memberId"],
      where: {
        householdId: member.householdId,
        status: { in: ["COMPLETED", "VERIFIED"] },
      },
      _count: { id: true },
    }),
  ]);

  const weeklyMap = new Map(weeklyCompletions.map((c) => [c.memberId, c._count.id]));
  const monthlyMap = new Map(monthlyCompletions.map((c) => [c.memberId, c._count.id]));
  const totalMap = new Map(totalCompletions.map((c) => [c.memberId, c._count.id]));

  const leaderboard: LeaderboardMember[] = allMembers
    .map((m) => ({
      id: m.id,
      name: m.name,
      memberType: m.memberType,
      level: m.level?.level ?? 1,
      xp: m.level?.xp ?? 0,
      weeklyTasks: weeklyMap.get(m.id) ?? 0,
      monthlyTasks: monthlyMap.get(m.id) ?? 0,
      totalTasks: totalMap.get(m.id) ?? 0,
    }))
    .sort((a, b) => b.xp - a.xp);

  // Members list for rewards display
  const members = allMembers.map((m) => ({ id: m.id, name: m.name }));

  // Calculate available points
  const level = await prisma.memberLevel.findUnique({
    where: { memberId: member.id },
  });

  const redemptions = await prisma.rewardRedemption.findMany({
    where: { memberId: member.id },
    include: {
      reward: { select: { pointsCost: true } },
    },
  });

  const spentPoints = redemptions.reduce((sum, r) => sum + r.reward.pointsCost, 0);
  const availablePoints = (level?.xp ?? 0) - spentPoints;

  // Check if there are completed tasks in the plan period
  const completedInPlan = latestPlan
    ? await prisma.assignment.count({
        where: {
          householdId: member.householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          createdAt: { gte: latestPlan.createdAt, lte: latestPlan.expiresAt },
        },
      })
    : 0;

  const hasCompletedTasks = completedInPlan > 0;

  // Can generate if there's an APPLIED plan with no rewards yet
  const canGenerate = aiEnabled && !!latestPlan && aiRewards.length === 0;

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recompensas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recompensas generadas según tu rendimiento en cada plan
        </p>
      </div>

      {/* Points Summary */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-yellow-500" />
              Puntos disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[var(--color-xp)]">{availablePoints}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Puntos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[var(--color-xp)]">{level?.xp ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Puntos canjeados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{spentPoints}</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <div className="mb-8">
        <Leaderboard members={leaderboard} currentMemberId={member.id} />
      </div>

      {/* AI Rewards Section */}
      <div className="mb-8">
        <PlanRewardsSection
          planId={latestPlan?.id ?? null}
          rewards={aiRewards.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            pointsCost: r.pointsCost,
            memberId: r.memberId,
            completionRate: r.completionRate,
          }))}
          members={members}
          canGenerate={canGenerate}
          hasCompletedTasks={hasCompletedTasks}
        />
      </div>

      {/* Past rewards history */}
      {pastRewards.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-muted-foreground">
            Recompensas anteriores
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {pastRewards.map((reward) => {
              const memberName = members.find((m) => m.id === reward.memberId)?.name ?? "Miembro";
              return (
                <Card key={reward.id} className="opacity-70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{reward.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{memberName}</p>
                    {reward.completionRate !== null && (
                      <p className="text-xs text-muted-foreground">
                        {reward.completionRate}% completado
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
