import { prisma } from "@/lib/prisma";
import { deliverNotificationToMembers } from "@/lib/push-delivery";

/**
 * processCulturalRecommendations — sends max 1 push/week per household
 * with the best-scored upcoming event in their city.
 */
export async function processCulturalRecommendations(
  activeHouseholdIds: Set<string>,
): Promise<number> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let sent = 0;

  const households = await prisma.household.findMany({
    where: {
      city: { not: null },
      members: { some: { isActive: true } },
      id: { in: [...activeHouseholdIds] },
    },
    select: { id: true, city: true, timezone: true },
  });

  for (const hh of households) {
    try {
      // Check if we already sent a CULTURAL_RECOMMENDATION in the last 7 days
      const alreadySent = await prisma.notification.findFirst({
        where: {
          type: "CULTURAL_RECOMMENDATION",
          createdAt: { gte: sevenDaysAgo },
          member: { householdId: hh.id },
        },
      });

      if (alreadySent) continue;

      // Find the best-scored active event in the household's city, happening soon
      const topEvent = await prisma.culturalEvent.findFirst({
        where: {
          status: "ACTIVE",
          finalScore: { not: null },
          startDate: { gte: now, lte: sevenDaysFromNow },
          city: { name: hh.city! },
        },
        orderBy: { finalScore: "desc" },
        select: {
          title: true,
          startDate: true,
          venueName: true,
        },
      });

      if (!topEvent || !topEvent.startDate) continue;

      const dayName = topEvent.startDate.toLocaleDateString("es-AR", {
        weekday: "long",
        timeZone: hh.timezone ?? "America/Argentina/Buenos_Aires",
      });

      const venue = topEvent.venueName ? ` en ${topEvent.venueName}` : "";

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
        type: "CULTURAL_RECOMMENDATION",
        title: "Esto te puede gustar",
        message: `${topEvent.title}${venue}, este ${dayName}`,
        actionUrl: "/descubrir",
        householdTimezone: hh.timezone,
      });

      sent += members.length;
    } catch (err) {
      console.error(
        `[cron/process] processCulturalRecommendations: failed for household ${hh.id}`,
        err,
      );
    }
  }

  return sent;
}
