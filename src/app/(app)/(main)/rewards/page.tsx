import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Leaderboard } from "@/components/features/leaderboard";
import { PlanRewardsSection } from "@/components/features/plan-rewards-section";
import { Coins, ExternalLink, Film, Sofa, TreePine, Trophy, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { statCardColors, spacing, iconSize, radius } from "@/lib/design-tokens";

import type { MemberType } from "@prisma/client";
import type { ReactNode } from "react";

const PAST_REWARD_CATEGORY_ICONS: Record<string, ReactNode> = {
  OUTING: <Film className={iconSize.sm} />,
  GASTRONOMY: <UtensilsCrossed className={iconSize.sm} />,
  OUTDOOR: <TreePine className={iconSize.sm} />,
  HOME: <Sofa className={iconSize.sm} />,
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
      <div className={spacing.pageHeader}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recompensas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recompensas generadas según tu rendimiento en cada plan
        </p>
      </div>

      {/* Points Summary */}
      <div className={`${spacing.sectionGapLg} grid grid-cols-3 gap-3 sm:gap-4`}>
        <div className={`${radius.cardCompact} ${statCardColors.lime.bg} p-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold sm:text-sm ${statCardColors.lime.text}`}>Disponibles</span>
            <Coins className={`${iconSize.md} shrink-0 opacity-70 ${statCardColors.lime.text}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold sm:text-3xl ${statCardColors.lime.text}`}>{availablePoints}</div>
          <p className={`text-xs opacity-60 ${statCardColors.lime.text}`}>puntos</p>
        </div>

        <div className={`${radius.cardCompact} ${statCardColors.purple.bg} p-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold sm:text-sm ${statCardColors.purple.text}`}>Totales</span>
            <Trophy className={`${iconSize.md} shrink-0 opacity-70 ${statCardColors.purple.text}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold sm:text-3xl ${statCardColors.purple.text}`}>{memberLevel?.xp ?? 0}</div>
          <p className={`text-xs opacity-60 ${statCardColors.purple.text}`}>ganados</p>
        </div>

        <div className={`${radius.cardCompact} ${statCardColors.tan.bg} p-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold sm:text-sm ${statCardColors.tan.text}`}>Canjeados</span>
            <ShoppingBag className={`${iconSize.md} shrink-0 opacity-70 ${statCardColors.tan.text}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold sm:text-3xl ${statCardColors.tan.text}`}>{spentPoints}</div>
          <p className={`text-xs opacity-60 ${statCardColors.tan.text}`}>gastados</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className={spacing.sectionGapLg}>
        <Leaderboard members={leaderboard} currentMemberId={member.id} />
      </div>

      {/* AI Rewards Section */}
      <div className={spacing.sectionGapLg}>
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
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {pastRewards.map((reward) => {
              const memberName = members.find((m) => m.id === reward.memberId)?.name ?? "Miembro";
              const categoryIcon = reward.category ? PAST_REWARD_CATEGORY_ICONS[reward.category] : null;
              return (
                <div key={reward.id} className="rounded-2xl bg-brand-lavender-light/40 p-4 opacity-70">
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
                      <ExternalLink className={iconSize.xs} />
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
