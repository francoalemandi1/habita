import { prisma } from "@/lib/prisma";
import { deliverNotificationToMembers } from "@/lib/push-delivery";

/**
 * processDealAlerts — sends push for deals with >50% discount.
 * Max 3/week per household.
 */
export async function processDealAlerts(): Promise<number> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let sent = 0;

  const households = await prisma.household.findMany({
    where: {
      members: { some: { isActive: true } },
    },
    select: { id: true, timezone: true },
  });

  for (const hh of households) {
    try {
      // Check how many DEAL_ALERTs we sent this week
      const recentAlerts = await prisma.notification.count({
        where: {
          type: "DEAL_ALERT",
          createdAt: { gte: sevenDaysAgo },
          member: { householdId: hh.id },
        },
      });

      // Count per-member, so divide by expected members to get actual alerts sent
      const members = await prisma.member.findMany({
        where: {
          householdId: hh.id,
          isActive: true,
          memberType: { in: ["ADULT", "TEEN"] },
        },
        select: { id: true },
      });

      if (members.length === 0) continue;

      const alertsSentThisWeek = Math.floor(recentAlerts / Math.max(members.length, 1));
      if (alertsSentThisWeek >= 3) continue;

      // Find the best bank promo with >50% discount
      const topDeal = await prisma.bankPromo.findFirst({
        where: {
          householdId: hh.id,
          discountPercent: { gt: 50 },
          validUntil: { gte: now },
        },
        orderBy: { discountPercent: "desc" },
        select: {
          storeName: true,
          discountPercent: true,
          bankDisplayName: true,
          title: true,
        },
      });

      if (!topDeal) continue;

      await deliverNotificationToMembers({
        memberIds: members.map((m) => m.id),
        type: "DEAL_ALERT",
        title: `Ofertón: ${topDeal.discountPercent}% en ${topDeal.storeName}`,
        message: `${topDeal.title ?? `${topDeal.discountPercent}% de descuento`} con ${topDeal.bankDisplayName}`,
        actionUrl: "/grocery-deals",
        householdTimezone: hh.timezone,
      });

      sent += members.length;
    } catch (err) {
      console.error(`[cron/process] processDealAlerts: failed for household ${hh.id}`, err);
    }
  }

  return sent;
}
