import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Card, CardContent } from "@/components/ui/card";
import { PlanStatusCard } from "@/components/features/plan-status-card";
import { PendingTransfers } from "@/components/features/pending-transfers";
import { FridgeCalendarView } from "@/components/features/fridge-calendar-view";
import { DailyBriefingWrapper } from "@/components/features/daily-briefing-wrapper";
import { PushOptInBanner } from "@/components/features/push-opt-in-banner";
import { InviteHomeCard } from "@/components/features/invite-home-card";
import { getWeekMonday, getWeekSunday } from "@/lib/calendar-utils";
import { ChevronRight, Dices, CalendarDays, Wallet, Sparkles, ChefHat } from "lucide-react";
import { spacing, iconSize } from "@/lib/design-tokens";

import type { MemberType } from "@prisma/client";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getMealLabel(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "desayuno";
  if (hour < 15) return "almuerzo";
  if (hour < 19) return "merienda";
  return "cena";
}

export default async function DashboardPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;
  const now = new Date();
  const monday = getWeekMonday(now);
  const sunday = getWeekSunday(monday);
  const aiEnabled = isAIEnabled();

  const [members, activePlan, transfers, calendarAssignments] =
    await Promise.all([
      prisma.member.findMany({
        where: { householdId, isActive: true },
        select: { id: true, name: true, memberType: true, avatarUrl: true },
      }),
      aiEnabled
        ? prisma.weeklyPlan.findFirst({
            where: {
              householdId,
              status: { in: ["PENDING", "APPLIED"] },
              expiresAt: { gt: now },
            },
            orderBy: { createdAt: "desc" },
          })
        : null,
      prisma.taskTransfer.findMany({
        where: {
          OR: [{ fromMemberId: member.id }, { toMemberId: member.id }],
          assignment: { householdId },
        },
        include: {
          assignment: {
            include: { task: { select: { id: true, name: true } } },
          },
          fromMember: { select: { id: true, name: true } },
          toMember: { select: { id: true, name: true } },
        },
        orderBy: { requestedAt: "desc" },
      }),
      prisma.assignment.findMany({
        where: {
          householdId,
          dueDate: { gte: monday, lte: sunday },
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          dueDate: true,
          status: true,
          completedAt: true,
          suggestedStartTime: true,
          suggestedEndTime: true,
          task: {
            select: { id: true, name: true, weight: true, frequency: true, estimatedMinutes: true },
          },
          member: {
            select: { id: true, name: true, memberType: true, avatarUrl: true },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);

  // Expense balance
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

  // Plan pending assignments for finalize modal
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

  // Auto-finalize plan if all assignments are done
  if (activePlan?.status === "APPLIED" && planPendingAssignments.length === 0) {
    try {
      await prisma.weeklyPlan.update({
        where: { id: activePlan.id },
        data: { status: "COMPLETED" },
      });
      redirect("/dashboard");
    } catch {
      // Non-blocking: continue rendering normally
    }
  }

  // Only show calendar assignments when plan is APPLIED (active and running)
  const hasAppliedPlan = activePlan?.status === "APPLIED";
  const calendarData = hasAppliedPlan ? calendarAssignments : [];

  // Serialize dates for client components
  const serializedAssignments = calendarData.map((a) => ({
    ...a,
    dueDate: a.dueDate.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
  }));

  const mealLabel = getMealLabel();

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Greeting */}
      <div className={spacing.pageHeader}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {getGreeting()}, {member.name}
        </h1>
        <p className="mt-0.5 text-sm capitalize text-muted-foreground">{formatTodayDate()}</p>
      </div>

      {/* Push opt-in */}
      <div className="hidden has-[>*]:block mb-6">
        <PushOptInBanner />
      </div>

      {/* Invite block (dismissable, solo si único miembro) */}
      {members.length === 1 && (
        <div className={spacing.sectionGap}>
          <InviteHomeCard inviteCode={member.household.inviteCode} householdName={member.household.name} />
        </div>
      )}

      {/* Briefing (arriba, contexto del hogar) */}
      <div className={spacing.sectionGap}>
        <DailyBriefingWrapper />
      </div>

      {/* Plan status */}
      {aiEnabled && (
        <div className={spacing.sectionGap}>
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
      )}

      {/* Transfers */}
      <div className={spacing.sectionGap}>
        <PendingTransfers transfers={transfers} currentMemberId={member.id} />
      </div>

      {/* Calendario semanal */}
      <div className={spacing.sectionGap}>
        {hasAppliedPlan ? (
          <FridgeCalendarView
            initialAssignments={serializedAssignments}
            members={members}
            initialWeekStart={monday.toISOString()}
            hideBackButton
          />
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarDays className={`${iconSize.xl} text-muted-foreground`} />
              <p className="text-sm font-medium">Calendario semanal</p>
              <p className="text-sm text-muted-foreground">
                Generá y aplicá un plan para ver las tareas de la semana
              </p>
              <Link
                href="/plan"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Crear plan
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Descubrir previews */}
      <div className={`${spacing.sectionGap} grid gap-3 sm:grid-cols-2`}>
        <Link href="/descubrir" className="group block">
          <Card className="border-violet-200/50 bg-violet-50/30 transition-all hover:shadow-md active:scale-[0.99]">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Planes para hoy</p>
                  <p className="text-xs text-muted-foreground">Cultura, restaurantes y actividades cerca tuyo</p>
                </div>
                <ChevronRight className={`${iconSize.sm} shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5`} />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/descubrir?tab=cocina" className="group block">
          <Card className="border-orange-200/50 bg-orange-50/30 transition-all hover:shadow-md active:scale-[0.99]">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                  <ChefHat className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Recetas</p>
                  <p className="text-xs text-muted-foreground">Sacá una foto de tu heladera y te sugerimos recetas para el {mealLabel}</p>
                </div>
                <ChevronRight className={`${iconSize.sm} shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5`} />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Balance de gastos */}
      <div className={spacing.sectionGap}>
        <Link
          href="/balance"
          className={`group flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm transition-all hover:shadow-md active:scale-[0.99] ${
            expenseBalance > 0
              ? "border border-green-200 bg-green-50"
              : expenseBalance < 0
                ? "border border-red-200 bg-red-50"
                : "border border-border bg-muted/30"
          }`}
        >
          <div className={`shrink-0 rounded-full p-2 ${
            expenseBalance > 0 ? "bg-green-100" : expenseBalance < 0 ? "bg-red-100" : "bg-muted"
          }`}>
            <Wallet className={`${iconSize.md} ${
              expenseBalance > 0 ? "text-green-600" : expenseBalance < 0 ? "text-red-600" : "text-muted-foreground"
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${
              expenseBalance > 0
                ? "text-green-800"
                : expenseBalance < 0
                  ? "text-red-800"
                  : "text-foreground"
            }`}>
              {expenseBalance > 0
                ? `Te deben $${expenseBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                : expenseBalance < 0
                  ? `Debés $${Math.abs(expenseBalance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                  : "Registrá tu primer gasto compartido"}
            </p>
            <p className={`text-xs ${
              expenseBalance > 0
                ? "text-green-600"
                : expenseBalance < 0
                  ? "text-red-600"
                  : "text-muted-foreground"
            }`}>
              {expenseBalance !== 0 ? "Ver gastos del hogar" : "Llevá las cuentas claras con tu hogar"}
            </p>
          </div>
          <ChevronRight className={`${iconSize.sm} shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5`} />
        </Link>
      </div>

      {/* Roulette CTA (card visible) */}
      <div className={spacing.sectionGap}>
        <Link href="/roulette" className="group block">
          <Card className="border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-primary/5 to-fuchsia-500/8 transition-all hover:scale-[1.01] hover:border-violet-400/50 hover:shadow-lg active:scale-[0.99]">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 shadow-sm">
                  <Dices className={`${iconSize.lg} text-violet-600 transition-transform group-hover:rotate-12`} />
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
      </div>
    </div>
  );
}
