import { prisma } from "@/lib/prisma";
import { deliverNotificationToMembers } from "@/lib/push-delivery";

/**
 * processSpendingAnomalyAlerts — sends SPENDING_ALERT when monthly variable spending
 * exceeds 130% of the 3-month average. Max 1 per household per month.
 */
export async function processSpendingAnomalyAlerts(
  activeHouseholdIds: Set<string>,
): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start1MonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start2MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const start3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

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
      // Dedup: max 1 per household per month
      const alreadySent = await prisma.notification.findFirst({
        where: {
          type: "SPENDING_ALERT",
          createdAt: { gte: startOfMonth },
          member: { householdId: hh.id },
        },
        select: { id: true },
      });

      if (alreadySent) continue;

      // Fetch this month + 3-month history in parallel
      const [thisMonth, month1, month2, month3] = await Promise.all([
        prisma.expense.aggregate({
          where: { householdId: hh.id, date: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { householdId: hh.id, date: { gte: start1MonthAgo, lt: startOfMonth } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { householdId: hh.id, date: { gte: start2MonthsAgo, lt: start1MonthAgo } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { householdId: hh.id, date: { gte: start3MonthsAgo, lt: start2MonthsAgo } },
          _sum: { amount: true },
        }),
      ]);

      const thisMonthTotal = thisMonth._sum.amount?.toNumber() ?? 0;
      const avg3Months =
        ((month1._sum.amount?.toNumber() ?? 0) +
          (month2._sum.amount?.toNumber() ?? 0) +
          (month3._sum.amount?.toNumber() ?? 0)) /
        3;

      // Only alert if we have history and current month exceeds 130% of average
      if (avg3Months < 1000 || thisMonthTotal < avg3Months * 1.3) continue;

      // Find the top category this month
      const topCategoryRaw = await prisma.expense.groupBy({
        by: ["category"],
        where: { householdId: hh.id, date: { gte: startOfMonth } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 1,
      });

      const topCategory = topCategoryRaw[0]?.category ?? null;
      const pctOver = Math.round(((thisMonthTotal - avg3Months) / avg3Months) * 100);

      const message = topCategory
        ? `Este mes ya van $${thisMonthTotal.toLocaleString("es-AR")} (+${pctOver}% vs promedio). La categoría con más gasto es ${topCategory.toLowerCase()}.`
        : `Este mes ya van $${thisMonthTotal.toLocaleString("es-AR")}, un ${pctOver}% más que el promedio de los últimos 3 meses.`;

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
        type: "SPENDING_ALERT",
        title: "Gasto del mes por encima del promedio",
        message,
        actionUrl: "/expense-insights",
        householdTimezone: hh.timezone,
      });

      sent += members.length;
    } catch (err) {
      console.error(
        `[cron/process] processSpendingAnomalyAlerts: failed for household ${hh.id}`,
        err,
      );
    }
  }

  return sent;
}
