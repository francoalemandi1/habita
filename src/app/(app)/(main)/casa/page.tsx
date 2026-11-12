import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveCityId } from "@/lib/events/city-normalizer";
import { getHouseholdBalances } from "@/lib/expense-balances";
import { getISOWeekNumber, getWeekMonday, getWeekSunday } from "@/lib/calendar-utils";
import { isSoloHousehold } from "@/lib/household-mode";
import { hasPendingAvisos } from "@/lib/avisos-indicator";
import { Banner } from "@/components/ds/banner";
import { TabScreen } from "@/components/ds/tab-screen";
import { InviteHomeCard } from "@/components/features/invite-home-card";
import { TareasCard } from "@/components/features/casa/tareas-card";
import { PlataCard } from "@/components/features/casa/plata-card";
import { SuperCard } from "@/components/features/casa/super-card";
import { DestacadoCard } from "@/components/features/casa/destacado-card";
import { CasaMobileHeader } from "@/components/features/casa/casa-mobile-header";
import { toDisplayTitle } from "@/lib/display-title";
import { CasaComposerLauncher } from "@/components/features/casa/casa-composer-launcher";
import {
  buildTransfersBannerText,
  describeDestacadoDate,
  filterTodayAssignments,
  filterTomorrowAssignments,
  formatMonthHeader,
  relativeDaysLabel,
} from "@/components/features/casa/casa-logic";
import { summarizeMyBalance, summarizeWeekTasks, formatCasaDateLabel } from "@habita/domain";

import type { DestacadoEvent } from "@/components/features/casa/destacado-card";
import type { SuperCardCart } from "@/components/features/casa/super-card";
import type { TodayTaskItem } from "@/components/features/casa/today-tasks-list";

// Older carts carry stale prices; Súper refreshes them on open, Casa just stops showing them.
const RECENT_CART_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

export default async function CasaPage() {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;
  const timeZone = member.household.timezone ?? DEFAULT_TIME_ZONE;
  const now = new Date();
  const monday = getWeekMonday(now);
  const sunday = getWeekSunday(monday);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    members,
    weekAssignments,
    householdBalances,
    monthlyAgg,
    latestCart,
    pendingItemCount,
    pendingTransfers,
    destacadoEvent,
    hasUnreadNotifications,
  ] =
    await Promise.all([
      prisma.member.findMany({
        where: { householdId, isActive: true },
        select: { id: true, name: true, memberType: true },
        orderBy: { createdAt: "asc" },
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
        select: { storeName: true, totalPrice: true, savedAt: true },
      }),
      prisma.shoppingListItem.count({ where: { householdId, checkedAt: null } }),
      prisma.taskTransfer.findMany({
        where: { toMemberId: member.id, status: "PENDING", assignment: { householdId } },
        select: { fromMember: { select: { name: true } }, assignment: { select: { task: { select: { name: true } } } } },
        orderBy: { requestedAt: "desc" },
      }),
      fetchDestacadoEvent({ cityName: member.household.city, now, timeZone }),
      hasPendingAvisos(member.id),
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
  const tomorrowItems: TodayTaskItem[] = filterTomorrowAssignments(weekAssignments, member.id, now).map((a) => ({
    id: a.id,
    name: a.task.name,
    meta: a.task.estimatedMinutes ? `${a.task.estimatedMinutes} min` : null,
    status: a.status,
  }));

  const primaryBalances = householdBalances.byCurrency[householdBalances.primaryCurrency];
  const myBalance = summarizeMyBalance(primaryBalances?.transactions ?? [], member.id);
  const monthlyTotal = monthlyAgg._sum.amount?.toNumber() ?? 0;

  const isCartRecent = latestCart !== null && now.getTime() - latestCart.savedAt.getTime() <= RECENT_CART_MAX_AGE_MS;
  const recentCart: SuperCardCart | null =
    latestCart && isCartRecent
      ? {
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
    <TabScreen
      eyebrow={`${formatCasaDateLabel(now, timeZone)} · Semana ${getISOWeekNumber(now)}`}
      title="La casa,"
      titleComplement="esta semana"
      aside={
        <div className="hidden xl:block">
          <CasaComposerLauncher />
        </div>
      }
      topBar={
        <CasaMobileHeader
          householdName={member.household.name}
          memberName={member.name}
          hasUnreadNotifications={hasUnreadNotifications}
        />
      }
    >
      {transferBannerText && (
        <Link href="/avisos" className="block rounded-[12px] outline-none focus-visible:ring-2 focus-visible:ring-monte">
          <Banner tone="attention">{transferBannerText}</Banner>
        </Link>
      )}

      <div className="hidden md:block xl:hidden">
        <CasaComposerLauncher />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.15fr_1fr] md:gap-4">
        <TareasCard
          summary={weekSummary}
          isSolo={isSolo}
          todayItems={todayItems}
          tomorrowItems={tomorrowItems}
          currentMemberType={member.memberType}
          className="md:row-span-2 md:self-start"
        />
        <PlataCard
          monthLabel={formatMonthHeader(now)}
          monthTotal={monthlyTotal}
          owedToMe={myBalance.owedToMe ? { memberName: myBalance.owedToMe.memberName, amount: myBalance.owedToMe.amount } : null}
          iOwe={myBalance.iOwe ? { memberName: myBalance.iOwe.memberName, amount: myBalance.iOwe.amount } : null}
          isSettled={myBalance.isSettled}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 md:gap-4">
          <SuperCard pendingItemCount={pendingItemCount} recentCart={recentCart} />
          <DestacadoCard event={destacadoEvent} />
        </div>
      </div>

      {isSolo && (
        <InviteHomeCard inviteCode={member.household.inviteCode} householdName={member.household.name} variant="subtle" />
      )}
    </TabScreen>
  );
}

interface DestacadoQuery {
  cityName: string | null;
  now: Date;
  timeZone: string;
}

/** Same selection as the pre-rebrand dashboard: best upcoming event with an editorial highlight. */
async function fetchDestacadoEvent({ cityName, now, timeZone }: DestacadoQuery): Promise<DestacadoEvent | null> {
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
      select: { id: true, title: true, description: true, startDate: true, venueName: true, imageUrl: true },
    });
    if (!eventRow) return null;

    const eventDate = eventRow.startDate ? describeDestacadoDate(eventRow.startDate, now, timeZone) : null;

    return {
      id: eventRow.id,
      title: toDisplayTitle(eventRow.title, eventRow.description),
      label: eventDate?.isThisWeekend ? "Para el finde" : "Destacado",
      meta: [eventDate?.label, eventRow.venueName].filter(Boolean).join(" · "),
      imageUrl: eventRow.imageUrl,
    };
  } catch (error) {
    console.error("[casa] Destacado event lookup failed:", error);
    return null;
  }
}
