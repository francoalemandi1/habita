import { prisma } from "@/lib/prisma";
import { deliverNotification, deliverNotificationToMembers } from "@/lib/push-delivery";
import { APP_ROUTES } from "@habita/contracts";

/**
 * processProactiveNotifications — creates 3 new proactive notification types:
 *   SERVICE_DUE_SOON, TASK_REMINDER, EXPENSE_WEEKLY_SUMMARY
 */
export async function processProactiveNotifications(): Promise<{
  serviceDueSoon: number;
  taskReminder: number;
  expenseWeeklySummary: number;
}> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const threeDaysFromNow = new Date(startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  let serviceDueSoon = 0;
  let taskReminder = 0;
  let expenseWeeklySummary = 0;

  // ----------------------------------------------------------------
  // 1. SERVICE_DUE_SOON
  // ----------------------------------------------------------------
  const upcomingServices = await prisma.service.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: threeDaysFromNow },
    },
    select: { id: true, title: true, nextDueDate: true, householdId: true },
  });

  for (const service of upcomingServices) {
    // Check if we already sent this notification within the last 7 days
    const existingNotification = await prisma.notification.findFirst({
      where: {
        type: "SERVICE_DUE_SOON",
        createdAt: { gte: sevenDaysAgo },
        metadata: { path: ["serviceId"], equals: service.id },
      },
      select: { id: true },
    });

    if (existingNotification) continue;

    // Find all adult members of the household
    const members = await prisma.member.findMany({
      where: {
        householdId: service.householdId,
        isActive: true,
        memberType: { in: ["ADULT", "TEEN"] },
      },
      select: { id: true },
    });

    const diffMs = service.nextDueDate.getTime() - startOfToday.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    let dueDateLabel: string;
    if (diffDays === 0) {
      dueDateLabel = "hoy";
    } else if (diffDays === 1) {
      dueDateLabel = "mañana";
    } else {
      dueDateLabel = `en ${diffDays} días`;
    }

    const household = await prisma.household.findUnique({
      where: { id: service.householdId },
      select: { timezone: true },
    });

    await deliverNotificationToMembers({
      memberIds: members.map((m) => m.id),
      type: "SERVICE_DUE_SOON",
      title: `Vence ${service.title}`,
      message: `El servicio "${service.title}" vence ${dueDateLabel}. Acordate de pagarlo a tiempo.`,
      actionUrl: "/services",
      metadata: { serviceId: service.id },
      householdTimezone: household?.timezone,
    });

    serviceDueSoon += members.length;
  }

  // ----------------------------------------------------------------
  // 2. TASK_REMINDER
  // ----------------------------------------------------------------
  // Find all active adult members across all households
  const allActiveMembers = await prisma.member.findMany({
    where: {
      isActive: true,
      memberType: { in: ["ADULT", "TEEN"] },
    },
    select: { id: true, householdId: true, name: true },
  });

  for (const memberRecord of allActiveMembers) {
    // Check if this member already has a TASK_REMINDER today
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        memberId: memberRecord.id,
        type: "TASK_REMINDER",
        createdAt: { gte: startOfToday },
      },
    });

    if (alreadyNotified) continue;

    // Find pending assignments due today for this member
    const dueTodayAssignments = await prisma.assignment.findMany({
      where: {
        memberId: memberRecord.id,
        householdId: memberRecord.householdId,
        status: "PENDING",
        dueDate: { lte: endOfToday },
      },
      select: { task: { select: { name: true } } },
      take: 10,
    });

    if (dueTodayAssignments.length === 0) continue;

    const count = dueTodayAssignments.length;
    const firstName = dueTodayAssignments[0]!.task.name;
    const message =
      count === 1
        ? `Tenés "${firstName}" pendiente para hoy.`
        : `Tenés ${count} tareas pendientes para hoy, como "${firstName}".`;

    await deliverNotification({
      memberId: memberRecord.id,
      type: "TASK_REMINDER",
      title: count === 1 ? "Tarea pendiente hoy" : `${count} tareas pendientes hoy`,
      message,
      actionUrl: "/tasks",
      sendPush: false,
    });

    taskReminder++;
  }

  // ----------------------------------------------------------------
  // 3. EXPENSE_WEEKLY_SUMMARY — runs on Mondays
  // ----------------------------------------------------------------
  const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday
  if (dayOfWeek === 1) {
    // It's Monday — compute last week's boundaries
    const startOfThisWeek = new Date(startOfToday.getTime() - 0); // today (Monday)
    const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1); // Sunday 23:59:59.999
    const startOfTwoWeeksAgo = new Date(startOfLastWeek.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all households
    const households = await prisma.household.findMany({
      select: { id: true },
    });

    for (const hh of households) {
      try {
        // Check if we already sent this week's summary for this household
        const alreadySent = await prisma.notification.findFirst({
          where: {
            type: "EXPENSE_WEEKLY_SUMMARY",
            createdAt: { gte: startOfThisWeek },
            member: { householdId: hh.id },
          },
        });

        if (alreadySent) continue;

        // Compute last week total and prior week total
        const [lastWeekAgg, priorWeekAgg] = await Promise.all([
          prisma.expense.aggregate({
            where: {
              householdId: hh.id,
              date: { gte: startOfLastWeek, lte: endOfLastWeek },
            },
            _sum: { amount: true },
          }),
          prisma.expense.aggregate({
            where: {
              householdId: hh.id,
              date: { gte: startOfTwoWeeksAgo, lt: startOfLastWeek },
            },
            _sum: { amount: true },
          }),
        ]);

        const lastWeekTotal = lastWeekAgg._sum.amount?.toNumber() ?? 0;
        const priorWeekTotal = priorWeekAgg._sum.amount?.toNumber() ?? 0;

        // Only send if there were expenses last week
        if (lastWeekTotal === 0) continue;

        let comparisonText = "";
        if (priorWeekTotal > 0) {
          const delta = ((lastWeekTotal - priorWeekTotal) / priorWeekTotal) * 100;
          const sign = delta >= 0 ? "+" : "";
          comparisonText = ` (${sign}${delta.toFixed(0)}% vs semana anterior)`;
        }

        const message = `La semana pasada el hogar gastó $${lastWeekTotal.toLocaleString("es-AR")}${comparisonText}.`;

        // Send to all active adult members
        const hhMembers = await prisma.member.findMany({
          where: {
            householdId: hh.id,
            isActive: true,
            memberType: { in: ["ADULT", "TEEN"] },
          },
          select: { id: true },
        });

        const hhTimezone = await prisma.household.findUnique({
          where: { id: hh.id },
          select: { timezone: true },
        });

        await deliverNotificationToMembers({
          memberIds: hhMembers.map((m) => m.id),
          type: "EXPENSE_WEEKLY_SUMMARY",
          title: "Resumen de gastos semanal",
          message,
          actionUrl: APP_ROUTES.plata,
          householdTimezone: hhTimezone?.timezone,
        });

        expenseWeeklySummary += hhMembers.length;
      } catch (err) {
        console.error(
          `[cron/process] processProactiveNotifications: failed for household ${hh.id}`,
          err,
        );
      }
    }
  }

  return { serviceDueSoon, taskReminder, expenseWeeklySummary };
}
