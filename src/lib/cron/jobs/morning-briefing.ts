import { prisma } from "@/lib/prisma";
import { deliverNotificationToMembers } from "@/lib/push-delivery";
import { getHouseholdBalances } from "@/lib/expense-balances";
import { APP_ROUTES } from "@habita/contracts";

/**
 * processMorningBriefing — sends a consolidated daily push at 8am per household timezone.
 * Dedup: max 1 DAILY_BRIEFING per household per day.
 */
export async function processMorningBriefing(
  activeHouseholdIds: Set<string>,
): Promise<number> {
  const now = new Date();
  let sent = 0;

  const households = await prisma.household.findMany({
    where: {
      members: { some: { isActive: true } },
      id: { in: [...activeHouseholdIds] },
    },
    select: { id: true, timezone: true },
  });

  for (const hh of households) {
    try {
      const tz = hh.timezone ?? "America/Argentina/Buenos_Aires";

      // Get local hour in household timezone
      const localHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "numeric",
          hour12: false,
        }).format(now),
        10,
      );

      // Only send between 7:45 and 8:30 (catches cron runs slightly off schedule)
      if (localHour < 7 || localHour > 8) continue;

      // Get start of today in household timezone
      const localDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now); // YYYY-MM-DD
      const startOfLocalDay = new Date(`${localDateStr}T00:00:00`);

      // Dedup: skip if already sent today
      const alreadySent = await prisma.notification.findFirst({
        where: {
          type: "DAILY_BRIEFING",
          createdAt: { gte: startOfLocalDay },
          member: { householdId: hh.id },
        },
        select: { id: true },
      });

      if (alreadySent) continue;

      // Gather data in parallel
      const endOfLocalDay = new Date(startOfLocalDay.getTime() + 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const [pendingToday, householdBalances, servicesDueSoon, topDeal] = await Promise.all([
        prisma.assignment.count({
          where: {
            householdId: hh.id,
            status: "PENDING",
            dueDate: { gte: now, lte: endOfLocalDay },
          },
        }),
        getHouseholdBalances(hh.id),
        prisma.service.count({
          where: {
            householdId: hh.id,
            isActive: true,
            nextDueDate: { lte: threeDaysFromNow },
          },
        }),
        prisma.bankPromo.findFirst({
          where: {
            householdId: hh.id,
            discountPercent: { gt: 30 },
            validUntil: { gte: now },
          },
          orderBy: { discountPercent: "desc" },
          select: { storeName: true, discountPercent: true },
        }),
      ]);

      // Build prioritized message (max 3 items)
      const items: string[] = [];

      if (pendingToday > 0) {
        items.push(`${pendingToday} tarea${pendingToday > 1 ? "s" : ""} para hoy`);
      }
      if (servicesDueSoon > 0) {
        items.push(`${servicesDueSoon} servicio${servicesDueSoon > 1 ? "s" : ""} vencen pronto`);
      }
      const primaryBalances = householdBalances.byCurrency[householdBalances.primaryCurrency]?.balances ?? [];
      const balance = primaryBalances
        .filter((b) => b.balance > 0)
        .reduce((sum, b) => sum + b.balance, 0);
      if (balance > 0) {
        items.push(`$${balance.toLocaleString("es-AR")} en gastos pendientes de saldar`);
      }
      if (topDeal && items.length < 3) {
        items.push(`${topDeal.discountPercent}% off en ${topDeal.storeName}`);
      }

      if (items.length === 0) continue;

      const message = items.join(" · ");

      const members = await prisma.member.findMany({
        where: {
          householdId: hh.id,
          isActive: true,
          memberType: { in: ["ADULT", "TEEN"] },
        },
        select: { id: true },
      });

      if (members.length === 0) continue;

      await deliverNotificationToMembers({
        memberIds: members.map((m) => m.id),
        type: "DAILY_BRIEFING",
        title: "Resumen del día",
        message,
        actionUrl: APP_ROUTES.casa,
        householdTimezone: hh.timezone,
      });

      sent += members.length;
    } catch (err) {
      console.error(`[cron/process] processMorningBriefing: failed for household ${hh.id}`, err);
    }
  }

  return sent;
}
