import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { resolveCityId } from "@/lib/events/city-normalizer";
import { Card, CardContent } from "@/components/ui/card";
import { PlanStatusCard } from "@/components/features/plan-status-card";
import { PendingTransfers } from "@/components/features/pending-transfers";
import { FridgeCalendarView } from "@/components/features/fridge-calendar-view";
import { PushOptInBanner } from "@/components/features/push-opt-in-banner";
import { OnboardingChecklist } from "@/components/features/onboarding-checklist";
import { InviteHomeCard } from "@/components/features/invite-home-card";
import { DashboardTour } from "@/components/features/dashboard-tour";
import { DashboardHeroCard, computeHeroState } from "@/components/features/dashboard-hero-card";
import { DashboardWeekCard } from "@/components/features/dashboard-week-card";
import { DashboardDailyHighlight, computeDailyHighlight } from "@/components/features/dashboard-daily-highlight";
import { getWeekMonday, getWeekSunday } from "@/lib/calendar-utils";
import { ChevronRight, CalendarDays, Wallet } from "lucide-react";
import { spacing, iconSize } from "@/lib/design-tokens";
import { isSoloHousehold, getHouseholdCopy } from "@/lib/household-mode";

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

  const [members, activePlan, transfers, calendarAssignments, firstExpense, firstCompletedTask, weeklyCompletions] =
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
          memberId: true,
          task: {
            select: { id: true, name: true, weight: true, frequency: true, estimatedMinutes: true },
          },
          member: {
            select: { id: true, name: true, memberType: true, avatarUrl: true },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.expense.findFirst({
        where: { householdId },
        select: { id: true },
      }),
      prisma.assignment.findFirst({
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
        },
        select: { id: true },
      }),
      // Weekly completions for stats (per member)
      prisma.assignment.findMany({
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: monday },
        },
        select: {
          memberId: true,
          task: { select: { weight: true } },
        },
      }),
    ]);

  const hasExpense = firstExpense !== null;
  const hasCompletedTask = firstCompletedTask !== null;

  // Build member stats for week card
  const weeklyCountMap = new Map<string, number>();
  const weeklyPointsMap = new Map<string, number>();
  for (const c of weeklyCompletions) {
    weeklyCountMap.set(c.memberId, (weeklyCountMap.get(c.memberId) ?? 0) + 1);
    weeklyPointsMap.set(c.memberId, (weeklyPointsMap.get(c.memberId) ?? 0) + c.task.weight);
  }
  const memberStats = members.map((m) => ({
    id: m.id,
    name: m.name,
    weeklyTasks: weeklyCountMap.get(m.id) ?? 0,
    weeklyPoints: weeklyPointsMap.get(m.id) ?? 0,
  }));

  // Household streak: consecutive weeks where ALL active members completed ≥1
  const fiftyTwoWeeksAgo = new Date(now);
  fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - 364);
  fiftyTwoWeeksAgo.setHours(0, 0, 0, 0);

  const streakCompletions = await prisma.assignment.findMany({
    where: {
      householdId,
      status: { in: ["COMPLETED", "VERIFIED"] },
      completedAt: { gte: fiftyTwoWeeksAgo },
    },
    select: { memberId: true, completedAt: true },
  });

  const activeMemberIds = new Set(members.map((m) => m.id));
  const completionsByWeek = new Map<string, Set<string>>();
  for (const c of streakCompletions) {
    if (c.completedAt) {
      const weekMonday = getWeekMonday(c.completedAt);
      const weekKey = weekMonday.toISOString().split("T")[0] ?? "";
      if (!completionsByWeek.has(weekKey)) {
        completionsByWeek.set(weekKey, new Set());
      }
      completionsByWeek.get(weekKey)!.add(c.memberId);
    }
  }

  let householdStreak = 0;
  const currentMonday = getWeekMonday(now);
  const walkDate = new Date(currentMonday);
  while (true) {
    const weekKey = walkDate.toISOString().split("T")[0] ?? "";
    const membersThisWeek = completionsByWeek.get(weekKey);
    const allActive = membersThisWeek != null
      && Array.from(activeMemberIds).every((id) => membersThisWeek.has(id));
    if (allActive) {
      householdStreak++;
      walkDate.setDate(walkDate.getDate() - 7);
    } else {
      break;
    }
  }

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

  // Hero state
  const todayStr = now.toDateString();
  const todayTaskCount = calendarAssignments.filter(
    (a) =>
      a.memberId === member.id &&
      a.dueDate.toDateString() === todayStr &&
      a.status !== "COMPLETED" &&
      a.status !== "VERIFIED",
  ).length;
  const pendingIncomingTransferCount = transfers.filter(
    (t) => t.toMemberId === member.id && t.status === "PENDING",
  ).length;
  const heroState = computeHeroState({
    todayTaskCount,
    pendingTransferCount: pendingIncomingTransferCount,
    expenseBalance,
  });

  // Top recommended cultural event for daily highlight
  const cityName = member.household.city ?? null;
  let recommendedEvent: { title: string; startDate: string | null; venueName: string | null; editorialHighlight: string | null } | null = null;
  if (cityName) {
    try {
      const cityId = await resolveCityId(cityName);
      const eventRow = await prisma.culturalEvent.findFirst({
        where: {
          status: "ACTIVE",
          ...(cityId ? { cityId } : {}),
          startDate: { gte: now },
          editorialHighlight: { not: null },
        },
        orderBy: [{ finalScore: { sort: "desc", nulls: "last" } }, { startDate: "asc" }],
        select: { title: true, startDate: true, venueName: true, editorialHighlight: true },
      });
      if (eventRow) {
        recommendedEvent = {
          title: eventRow.title,
          startDate: eventRow.startDate?.toISOString() ?? null,
          venueName: eventRow.venueName,
          editorialHighlight: eventRow.editorialHighlight,
        };
      }
    } catch {
      // Non-blocking: fall back to recipe highlight
    }
  }
  const dailyHighlight = computeDailyHighlight(recommendedEvent);

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

  const isSolo = isSoloHousehold(members.length);
  const householdCopy = getHouseholdCopy(isSolo);

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Greeting */}
      <div className={spacing.pageHeader}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {getGreeting()}, {member.name}
        </h1>
        <p className="mt-0.5 text-sm capitalize text-muted-foreground">{formatTodayDate()}</p>
      </div>

      {/* Guided tour */}
      <DashboardTour isSharedHousehold={!isSolo} />

      {/* Onboarding checklist */}
      <div className="mb-6">
        <OnboardingChecklist hasExpense={hasExpense} hasCompletedTask={hasCompletedTask} />
      </div>

      {/* Push opt-in */}
      <div className="hidden has-[>*]:block mb-6">
        <PushOptInBanner />
      </div>

      {/* Invite block (dismissable, solo si único miembro) */}
      {isSolo && (
        <div className={spacing.sectionGap}>
          <InviteHomeCard inviteCode={member.household.inviteCode} householdName={member.household.name} variant="subtle" />
        </div>
      )}

      {/* Hero card */}
      <div className={spacing.sectionGap}>
        <DashboardHeroCard state={heroState} />
      </div>

      {/* Household week card (gamification) */}
      <div className={spacing.sectionGap}>
        <DashboardWeekCard
          memberStats={memberStats}
          householdStreak={householdStreak}
          isSolo={isSolo}
          currentMemberId={member.id}
        />
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
            memberCount={members.length}
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

      {/* Daily highlight */}
      <div className={spacing.sectionGap}>
        <DashboardDailyHighlight highlight={dailyHighlight} />
      </div>

      {/* Balance de gastos */}
      <div className={spacing.sectionGap}>
        <Link
          href="/balance"
          className={`group flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm transition-all hover:shadow-md active:scale-[0.99] ${
            expenseBalance > 0
              ? "border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : expenseBalance < 0
                ? "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border border-border bg-muted/30"
          }`}
        >
          <div className={`shrink-0 rounded-full p-2 ${
            expenseBalance > 0 ? "bg-green-100 dark:bg-green-900/40" : expenseBalance < 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-muted"
          }`}>
            <Wallet className={`${iconSize.md} ${
              expenseBalance > 0 ? "text-green-600 dark:text-green-400" : expenseBalance < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${
              expenseBalance > 0
                ? "text-green-800 dark:text-green-300"
                : expenseBalance < 0
                  ? "text-red-800 dark:text-red-300"
                  : "text-foreground"
            }`}>
              {expenseBalance > 0
                ? `Te deben $${expenseBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                : expenseBalance < 0
                  ? `Debés $${Math.abs(expenseBalance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                  : householdCopy.balanceEmpty}
            </p>
            <p className={`text-xs ${
              expenseBalance > 0
                ? "text-green-600 dark:text-green-400"
                : expenseBalance < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
            }`}>
              {expenseBalance !== 0 ? "Ver gastos del hogar" : householdCopy.balanceSubtitle}
            </p>
          </div>
          <ChevronRight className={`${iconSize.sm} shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5`} />
        </Link>
      </div>

    </div>
  );
}
