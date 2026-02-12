import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Card, CardContent } from "@/components/ui/card";
import { DailyBriefingWrapper } from "@/components/features/daily-briefing-wrapper";
import { PushOptInBanner } from "@/components/features/push-opt-in-banner";
import { WhatsAppOptInBanner } from "@/components/features/whatsapp-opt-in-banner";
import { PlanStatusCard } from "@/components/features/plan-status-card";
import { InviteShareBlock } from "@/components/features/invite-share-block";

import { UserPlus, ChevronRight, Dices, CalendarDays, Wallet } from "lucide-react";
import { spacing, iconSize } from "@/lib/design-tokens";


import type { MemberType } from "@prisma/client";

export default async function DashboardPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;
  const now = new Date();
  const [members, activePlan] =
    await Promise.all([
      prisma.member.findMany({
        where: { householdId, isActive: true },
        select: { id: true },
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

  // Compute member's expense balance
  // othersOweMe: unsettled splits on expenses I paid, where the split member is not me
  // iOweOthers: unsettled splits on expenses others paid, where the split member is me
  const [othersOweMeAgg, iOweOthersAgg] = await Promise.all([
    prisma.expenseSplit.aggregate({
      where: {
        settled: false,
        memberId: { not: member.id },
        expense: { householdId, paidById: member.id },
      },
      _sum: { amount: true },
    }),
    prisma.expenseSplit.aggregate({
      where: {
        settled: false,
        memberId: member.id,
        expense: { householdId, paidById: { not: member.id } },
      },
      _sum: { amount: true },
    }),
  ]);
  const othersOweMe = othersOweMeAgg._sum.amount?.toNumber() ?? 0;
  const iOweOthers = iOweOthersAgg._sum.amount?.toNumber() ?? 0;
  const expenseBalance = Math.round((othersOweMe - iOweOthers) * 100) / 100;

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
      <div className={spacing.pageHeader}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{member.household.name}</h1>
      </div>

      {/* Row 1 desktop: Invite + Opt-in (Push + WhatsApp) en misma fila cuando hay 1 miembro; misma altura Invite y WhatsApp */}
      {members.length === 1 ? (
        <div className={`${spacing.sectionGap} grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch`}>
          <Card className="min-w-0 border-primary/20 bg-primary/5">
            <CardContent className="min-w-0 pt-4 pb-4 sm:pt-6 sm:pb-6">
              <div className="mb-3 flex min-w-0 items-center gap-2">
                <UserPlus className={`${iconSize.lg} shrink-0 text-primary`} />
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
        <div className="hidden has-[>*]:flex has-[>*]:flex-col mb-6 gap-3 pt-4">
          <PushOptInBanner />
          <WhatsAppOptInBanner />
        </div>
      )}

      {/* Plan: bloque full width con más jerarquía */}
      {aiEnabled && (
        <div className={spacing.sectionGap}>
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
            <div className="mt-2 border-t border-black/5 pt-2">
              <Link
                href="/plans"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CalendarDays className={iconSize.xs} />
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Ruleta + Calendario — feature cards (right after plan for visibility) */}
      <div className={`${spacing.sectionGap} grid gap-4 sm:grid-cols-2`}>
        {/* Ruleta — icono balanceo + card con glow que respira (mobile + desktop) */}
        <Link href="/roulette" className="group block">
          <Card className="ruleta-card-alive border-violet-400/25 bg-linear-to-br from-violet-500/10 via-primary/5 to-fuchsia-500/8 transition-all duration-200 hover:scale-[1.02] hover:border-violet-400/50 hover:shadow-lg active:scale-[0.98]">
            <CardContent className="py-5 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/15 shadow-sm transition-all duration-200 group-hover:from-violet-500/30 group-hover:to-fuchsia-500/20 group-hover:shadow-md group-hover:[&>svg]:rotate-12">
                  <Dices className={`${iconSize.lg} text-violet-600 dark:text-violet-400 animate-dice-idle transition-transform duration-200`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Ruleta de tareas</p>
                  <p className="text-xs text-muted-foreground">Asigna una tarea al azar</p>
                </div>
                <ChevronRight className={`${iconSize.md} shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5`} />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Calendario — barra lateral siempre visible con pulso (mobile + desktop) */}
        <Link href="/calendar" className="group block">
          <Card className="calendar-card-alive border-sky-400/25 bg-linear-to-br from-sky-500/10 via-cyan-500/5 to-teal-500/8 transition-all duration-200 hover:border-sky-400/45 hover:shadow-md active:scale-[0.99]">
            <CardContent className="py-5 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500/20 to-teal-500/15 shadow-sm transition-colors group-hover:from-sky-500/25 group-hover:to-teal-500/20">
                  <CalendarDays className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Calendario semanal</p>
                  <p className="text-xs text-muted-foreground">Vista de la semana del hogar</p>
                </div>
                <ChevronRight className={`${iconSize.md} shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5`} />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Balance de gastos */}
      {expenseBalance !== 0 && (
        <div className={spacing.sectionGap}>
          <Link
            href="/expenses"
            className={`group block rounded-2xl ${spacing.cardPaddingCompact} shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99] ${
              expenseBalance > 0
                ? "border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                : "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`shrink-0 rounded-full p-2 ${
                expenseBalance > 0
                  ? "bg-green-100 dark:bg-green-900"
                  : "bg-red-100 dark:bg-red-900"
              }`}>
                <Wallet className={`${iconSize.lg} ${
                  expenseBalance > 0 ? "text-green-600" : "text-red-600"
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${
                  expenseBalance > 0
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}>
                  {expenseBalance > 0
                    ? `Te deben $${expenseBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                    : `Debés $${Math.abs(expenseBalance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
                </p>
                <p className={`text-sm ${
                  expenseBalance > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  Ver gastos del hogar
                </p>
              </div>
              <ChevronRight className={`${iconSize.md} shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5`} />
            </div>
          </Link>
        </div>
      )}

      {/* Briefing con insights de IA */}
      <div className={`${spacing.sectionGap} pt-4`}>
        <DailyBriefingWrapper />
      </div>

    </div>
  );
}
