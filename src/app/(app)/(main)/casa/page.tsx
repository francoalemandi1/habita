import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveCityId } from "@/lib/events/city-normalizer";
import { getHouseholdBalances } from "@/lib/expense-balances";
import { getWeekMonday, getWeekSunday } from "@/lib/calendar-utils";
import { isSoloHousehold } from "@/lib/household-mode";
import { Banner } from "@/components/ds/banner";
import { InviteHomeCard } from "@/components/features/invite-home-card";
import { TareasCard } from "@/components/features/casa/tareas-card";
import { PlataCard } from "@/components/features/casa/plata-card";
import { SuperCard } from "@/components/features/casa/super-card";
import { DestacadoCard } from "@/components/features/casa/destacado-card";
import {
  buildTransfersBannerText,
  countCartProducts,
  filterTodayAssignments,
  formatMonthHeader,
  relativeDaysLabel,
} from "@/components/features/casa/casa-logic";
import { summarizeMyBalance, summarizeWeekTasks, formatCasaDateLabel } from "@habita/domain";

import type { DestacadoEvent } from "@/components/features/casa/destacado-card";
import type { SuperCardCart } from "@/components/features/casa/super-card";
import type { TodayTaskItem } from "@/components/features/casa/today-tasks-list";

export default async function CasaPage() {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;
  const now = new Date();
  const monday = getWeekMonday(now);
  const sunday = getWeekSunday(monday);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [members, weekAssignments, householdBalances, monthlyAgg, latestCart, pendingTransfers, destacadoEvent] =
    await Promise.all([
      prisma.member.findMany({
        where: { householdId, isActive: true },
        select: { id: true, name: true, memberType: true },
      }),
      prisma.assignment.findMany({
        where: { householdId, dueDate: { gte: monday, lte: sunday }, status: { not: "CANCELLED" } },
        select: {
          id: true,
          memberId: true,
          completedByMemberId: true,
          dueDate: true,
          status: true,
          task: { select: { name: true, estimatedMinutes: true } },
        },
      }),
      getHouseholdBalances(householdId),
      prisma.expense.aggregate({
        where: { householdId, date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.savedCart.findFirst({
        where: { memberId: member.id, householdId },
        orderBy: { savedAt: "desc" },
        select: { storeName: true, products: true, totalPrice: true, savedAt: true },
      }),
      prisma.taskTransfer.findMany({
        where: { toMemberId: member.id, status: "PENDING", assignment: { householdId } },
        select: { fromMember: { select: { name: true } }, assignment: { select: { task: { select: { name: true } } } } },
        orderBy: { requestedAt: "desc" },
      }),
      fetchDestacadoEvent(member.household.city, now),
    ]);

  const weekSummary = summarizeWeekTasks({
    assignments: weekAssignments.map((a) => ({
      memberId: a.memberId,
      completedByMemberId: a.completedByMemberId,
      status: a.status,
    })),
    members,
    currentMemberId: member.id,
  });

  const todayItems: TodayTaskItem[] = filterTodayAssignments(weekAssignments, member.id, now).map((a) => ({
    id: a.id,
    name: a.task.name,
    meta: a.task.estimatedMinutes ? `${a.task.estimatedMinutes} min` : null,
    status: a.status,
  }));

  const primaryBalances = householdBalances.byCurrency[householdBalances.primaryCurrency];
  const myBalance = summarizeMyBalance(primaryBalances?.transactions ?? [], member.id);
  const monthlyTotal = monthlyAgg._sum.amount?.toNumber() ?? 0;

  const superCart: SuperCardCart | null = latestCart
    ? {
        productCount: countCartProducts(latestCart.products),
        storeName: latestCart.storeName,
        totalPrice: latestCart.totalPrice,
        relativeLabel: relativeDaysLabel(latestCart.savedAt, now),
      }
    : null;

  const transferBannerText = buildTransfersBannerText(
    pendingTransfers.map((t) => ({ taskName: t.assignment.task.name, fromName: t.fromMember.name })),
  );

  const isSolo = isSoloHousehold(members.length);

  return (
    <div className="container max-w-4xl space-y-4 px-4 py-6 sm:py-8 md:px-8">
      <div className="mb-2 flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">
          {formatCasaDateLabel(now)}
        </span>
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-.035em] text-ink">
          La casa, <span className="text-ink-3">esta semana</span>
        </h1>
      </div>

      {transferBannerText && (
        <Link href="/transfers" className="block">
          <Banner tone="attention">{transferBannerText}</Banner>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.25fr_1fr]">
        <TareasCard
          summary={weekSummary}
          isSolo={isSolo}
          todayItems={todayItems}
          currentMemberType={member.memberType}
        />
        <div className="flex flex-col gap-4">
          <PlataCard
            monthLabel={formatMonthHeader(now)}
            monthTotal={monthlyTotal}
            owedToMe={myBalance.owedToMe ? { memberName: myBalance.owedToMe.memberName, amount: myBalance.owedToMe.amount } : null}
            iOwe={myBalance.iOwe ? { memberName: myBalance.iOwe.memberName, amount: myBalance.iOwe.amount } : null}
            isSettled={myBalance.isSettled}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SuperCard cart={superCart} />
            <DestacadoCard event={destacadoEvent} />
          </div>
        </div>
      </div>

      {isSolo && (
        <InviteHomeCard inviteCode={member.household.inviteCode} householdName={member.household.name} variant="subtle" />
      )}
    </div>
  );
}

/** Same selection as the pre-rebrand dashboard: best upcoming event with an editorial highlight. */
async function fetchDestacadoEvent(cityName: string | null, now: Date): Promise<DestacadoEvent | null> {
  if (!cityName) return null;

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
      select: { id: true, title: true, startDate: true, venueName: true, editorialHighlight: true },
    });
    if (!eventRow) return null;

    const dateLabel = eventRow.startDate
      ? eventRow.startDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })
      : null;
    const subtitle = eventRow.editorialHighlight ?? [dateLabel, eventRow.venueName].filter(Boolean).join(" · ");

    return { id: eventRow.id, title: eventRow.title, subtitle };
  } catch {
    return null;
  }
}
