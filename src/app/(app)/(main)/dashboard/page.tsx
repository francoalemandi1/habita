import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCards } from "@/components/features/stats-cards";
import { DailyBriefingWrapper } from "@/components/features/daily-briefing-wrapper";
import { DailyChecklist } from "@/components/features/daily-checklist";
import { PushOptInBanner } from "@/components/features/push-opt-in-banner";
import { WhatsAppOptInBanner } from "@/components/features/whatsapp-opt-in-banner";
import { PlanStatusCard } from "@/components/features/plan-status-card";
import { InviteShareBlock } from "@/components/features/invite-share-block";
import { UserPlus, Trophy, ChevronRight } from "lucide-react";

import type { MemberType } from "@prisma/client";

export default async function DashboardPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [members, totalCompleted, pendingCount, overdueCount, recentAchievements, activePlan, myAssignments, myCompletedToday] =
    await Promise.all([
      prisma.member.findMany({
        where: { householdId, isActive: true },
        select: { id: true },
      }),
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
      prisma.memberAchievement.findMany({
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
      }),
      prisma.weeklyPlan.findFirst({
        where: {
          householdId,
          status: { in: ["PENDING", "APPLIED"] },
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.assignment.findMany({
        where: {
          memberId: member.id,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { lte: endOfToday },
        },
        include: {
          task: { select: { name: true, estimatedMinutes: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.assignment.count({
        where: {
          memberId: member.id,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: startOfToday },
        },
      }),
    ]);

  const aiEnabled = isAIEnabled();

  // Fetch pending assignments for plan finalization modal (only when plan is APPLIED)
  const planPendingAssignments = activePlan?.status === "APPLIED"
    ? await prisma.assignment.findMany({
        where: {
          householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          createdAt: { gte: activePlan.appliedAt ?? activePlan.createdAt },
        },
        select: {
          id: true,
          dueDate: true,
          member: { select: { name: true } },
          task: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
      })
    : [];

  // Auto-finalize plan if all plan assignments are done (catches edge cases where auto-finalize didn't fire)
  if (activePlan?.status === "APPLIED" && planPendingAssignments.length === 0) {
    try {
      await prisma.weeklyPlan.update({
        where: { id: activePlan.id },
        data: { status: "COMPLETED" },
      });
      // Redirect to self so the dashboard re-renders with the plan now COMPLETED (shows "Genera un plan")
      redirect("/dashboard");
    } catch {
      // Non-blocking: if update fails, continue rendering normally
    }
  }

  return (
    <div className="container max-w-6xl px-4 py-6 sm:py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{member.household.name}</h1>
      </div>

      {/* Invite banner - when only 1 member */}
      {members.length === 1 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="mb-3 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary shrink-0" />
              <p className="font-medium">¡Invitá a los miembros de tu hogar!</p>
            </div>
            <InviteShareBlock inviteCode={member.household.inviteCode} householdName={member.household.name} />
          </CardContent>
        </Card>
      )}

      {/* Opt-in banners */}
      <div className="mb-6 space-y-3">
        <PushOptInBanner />
        <WhatsAppOptInBanner />
      </div>

      {/* Daily briefing card */}
      <div className="mb-6">
        <DailyBriefingWrapper />
      </div>

      {/* Daily checklist - quick task completion */}
      <div className="mb-6">
        <DailyChecklist
          assignments={myAssignments.map((a) => ({
            id: a.id,
            task: { name: a.task.name, estimatedMinutes: a.task.estimatedMinutes },
            dueDate: a.dueDate,
          }))}
          completedToday={myCompletedToday}
        />
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
            allAssignmentsDone={activePlan?.status === "APPLIED" && planPendingAssignments.length === 0}
            pendingAssignments={planPendingAssignments.map((a) => ({
              id: a.id,
              taskName: a.task.name,
              memberName: a.member.name,
              dueDate: a.dueDate,
            }))}
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
          <Link href="/achievements">
            <Card className="border-[var(--color-xp)]/20 bg-[var(--color-xp)]/5 transition-colors hover:bg-[var(--color-xp)]/10">
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Trophy className="h-4 w-4 shrink-0 text-yellow-500" />
                    <span className="truncate text-sm font-medium">
                      {recentAchievements[0]!.member.name} desbloqueó: {recentAchievements[0]!.achievement.name}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
