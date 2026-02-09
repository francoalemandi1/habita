import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Leaderboard } from "@/components/features/leaderboard";
import { PlanRewardsSection } from "@/components/features/plan-rewards-section";
import { Coins, ExternalLink, Film, Sofa, TreePine, Trophy, ShoppingBag, UtensilsCrossed } from "lucide-react";

import type { MemberType } from "@prisma/client";
import type { ReactNode } from "react";

const PAST_REWARD_CATEGORY_ICONS: Record<string, ReactNode> = {
  OUTING: <Film className="h-3.5 w-3.5" />,
  GASTRONOMY: <UtensilsCrossed className="h-3.5 w-3.5" />,
  OUTDOOR: <TreePine className="h-3.5 w-3.5" />,
  HOME: <Sofa className="h-3.5 w-3.5" />,
};

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

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // First batch: latestPlan + all independent queries
  const [latestPlan, allMembers, weeklyCompletions, monthlyCompletions, totalCompletions, memberLevel, redemptions] =
    await Promise.all([
      prisma.weeklyPlan.findFirst({
        where: { householdId: member.householdId, status: "APPLIED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.member.findMany({
        where: { householdId: member.householdId, isActive: true },
        include: { level: { select: { level: true, xp: true } } },
      }),
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
      prisma.memberLevel.findUnique({
        where: { memberId: member.id },
        select: { xp: true },
      }),
      prisma.rewardRedemption.findMany({
        where: { memberId: member.id },
        select: { reward: { select: { pointsCost: true } } },
      }),
    ]);

  // Second batch: queries that depend on latestPlan
  const [aiRewards, pastRewards, completedInPlan] = await Promise.all([
    prisma.householdReward.findMany({
      where: {
        householdId: member.householdId,
        isAiGenerated: true,
        ...(latestPlan ? { planId: latestPlan.id } : {}),
      },
      orderBy: { completionRate: "desc" },
    }),
    prisma.householdReward.findMany({
      where: {
        householdId: member.householdId,
        isAiGenerated: true,
        ...(latestPlan ? { planId: { not: latestPlan.id } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    latestPlan
      ? prisma.assignment.count({
          where: {
            householdId: member.householdId,
            status: { in: ["COMPLETED", "VERIFIED"] },
            createdAt: { gte: latestPlan.createdAt, lte: latestPlan.expiresAt },
          },
        })
      : Promise.resolve(0),
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

  const members = allMembers.map((m) => ({ id: m.id, name: m.name }));

  const spentPoints = redemptions.reduce((sum, r) => sum + r.reward.pointsCost, 0);
  const availablePoints = (memberLevel?.xp ?? 0) - spentPoints;

  const hasCompletedTasks = completedInPlan > 0;

  // Can generate if there's an APPLIED plan with no rewards yet
  const canGenerate = aiEnabled && !!latestPlan && aiRewards.length === 0;

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recompensas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recompensas generadas según tu rendimiento en cada plan
        </p>
      </div>

      {/* Points Summary */}
      <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-[10px] bg-[#d2ffa0] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#272727] sm:text-sm">Disponibles</span>
            <Coins className="h-4 w-4 shrink-0 text-[#272727] opacity-70" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#272727] sm:text-3xl">{availablePoints}</div>
          <p className="text-xs text-[#272727] opacity-60">puntos</p>
        </div>

        <div className="rounded-[10px] bg-[#d0b6ff] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#522a97] sm:text-sm">Totales</span>
            <Trophy className="h-4 w-4 shrink-0 text-[#522a97] opacity-70" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#522a97] sm:text-3xl">{memberLevel?.xp ?? 0}</div>
          <p className="text-xs text-[#522a97] opacity-60">ganados</p>
        </div>

        <div className="rounded-[10px] bg-[#ffe8c3] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#272727] sm:text-sm">Canjeados</span>
            <ShoppingBag className="h-4 w-4 shrink-0 text-[#272727] opacity-70" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#272727] sm:text-3xl">{spentPoints}</div>
          <p className="text-xs text-[#272727] opacity-60">gastados</p>
        </div>
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
            category: r.category,
            actionUrl: r.actionUrl,
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
              const categoryIcon = reward.category ? PAST_REWARD_CATEGORY_ICONS[reward.category] : null;
              return (
                <div key={reward.id} className="rounded-2xl bg-[#e4d5ff]/40 p-4 opacity-70">
                  <div className="flex items-center gap-1.5">
                    {categoryIcon && <span className="shrink-0 text-muted-foreground">{categoryIcon}</span>}
                    <p className="font-medium text-sm text-foreground truncate">{reward.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{memberName}</p>
                  {reward.completionRate !== null && (
                    <p className="text-xs text-muted-foreground">
                      {reward.completionRate}% completado
                    </p>
                  )}
                  {reward.actionUrl && (
                    <a
                      href={reward.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver actividad
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
