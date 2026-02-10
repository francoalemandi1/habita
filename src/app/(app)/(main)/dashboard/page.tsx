import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCards } from "@/components/features/stats-cards";
import { DailyBriefingWrapper } from "@/components/features/daily-briefing-wrapper";
import { PushOptInBanner } from "@/components/features/push-opt-in-banner";
import { WhatsAppOptInBanner } from "@/components/features/whatsapp-opt-in-banner";
import { PlanStatusCard } from "@/components/features/plan-status-card";
import { InviteShareBlock } from "@/components/features/invite-share-block";
import { UserPlus, Trophy, ChevronRight, Dices, CalendarDays } from "lucide-react";

import type { MemberType } from "@prisma/client";

export default async function DashboardPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [members, totalCompleted, pendingCount, recentAchievements, activePlan] =
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
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{member.household.name}</h1>
      </div>

      {/* Row 1 desktop: Invite + Opt-in (Push + WhatsApp) en misma fila cuando hay 1 miembro; misma altura Invite y WhatsApp */}
      {members.length === 1 ? (
        <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
          <Card className="min-w-0 border-primary/20 bg-primary/5">
            <CardContent className="min-w-0 pt-4 pb-4 sm:pt-6 sm:pb-6">
              <div className="mb-3 flex min-w-0 items-center gap-2">
                <UserPlus className="h-5 w-5 shrink-0 text-primary" />
                <p className="min-w-0 font-medium">¡Invitá a los miembros de tu hogar!</p>
              </div>
              <div className="min-w-0">
                <InviteShareBlock inviteCode={member.household.inviteCode} householdName={member.household.name} />
              </div>
            </CardContent>
          </Card>
          <div className="flex min-w-0 flex-col gap-3 pt-4 md:pt-0">
            <PushOptInBanner />
            <div className="flex min-h-0 min-w-0 flex-col md:flex-1">
              <WhatsAppOptInBanner />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-3 pt-4">
          <PushOptInBanner />
          <WhatsAppOptInBanner />
        </div>
      )}

      {/* Plan: bloque full width con más jerarquía */}
      {aiEnabled && (
        <div className="mb-6">
          <div className="pt-4">
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
        </div>
      )}

      {/* Ruleta + Calendario — feature cards (right after plan for visibility) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {/* Ruleta — violet/purple personality */}
        <Link href="/roulette" className="group">
          <Card
            className="feature-card-shimmer animate-glow-breathe border-violet-400/30 bg-linear-to-br from-violet-500/10 via-primary/5 to-fuchsia-500/8 transition-all duration-300 hover:scale-[1.02] hover:border-violet-400/50 hover:shadow-lg active:scale-[0.98]"
            style={{ "--glow-color": "hsl(262 83% 58% / 0.20)" } as React.CSSProperties}
          >
            <CardContent className="py-5 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/15 shadow-sm transition-all group-hover:from-violet-500/30 group-hover:to-fuchsia-500/20 group-hover:shadow-md">
                  <Dices className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Ruleta de tareas</p>
                  <p className="text-xs text-muted-foreground">Asigna una tarea al azar</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Calendario — sky/teal personality */}
        <Link href="/calendar" className="group">
          <Card
            className="feature-card-shimmer animate-glow-breathe border-sky-400/30 bg-linear-to-br from-sky-500/10 via-cyan-500/5 to-teal-500/8 transition-all duration-300 hover:scale-[1.02] hover:border-sky-400/50 hover:shadow-lg active:scale-[0.98]"
            style={{ "--glow-color": "hsl(200 80% 55% / 0.20)", animationDelay: "1.5s" } as React.CSSProperties}
          >
            <CardContent className="py-5 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500/20 to-teal-500/15 shadow-sm transition-all group-hover:from-sky-500/30 group-hover:to-teal-500/20 group-hover:shadow-md">
                  <CalendarDays className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Calendario semanal</p>
                  <p className="text-xs text-muted-foreground">Vista de la semana del hogar</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Bloque 1: Sugerencias (briefing) */}
      <div className="mb-6 pt-4">
        <DailyBriefingWrapper />
      </div>

      {/* Bloque 2: Stats (4 cards en una fila en desktop) */}
      <div className="mb-6">
        <StatsCards
          completed={totalCompleted}
          pending={pendingCount}
          members={members.length}
        />
      </div>

      {/* Logros */}
      <div className="space-y-6 pt-4">
        {recentAchievements.length > 0 && (
          <div>
            <Link href="/achievements">
              <Card className="border-[var(--color-xp)]/20 bg-[var(--color-xp)]/5 transition-colors hover:bg-[var(--color-xp)]/10">
                <CardContent className="py-4 pt-4 sm:py-6 sm:pt-6">
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
    </div>
  );
}
