import { after, NextResponse } from "next/server";
import { processAbsenceRedistribution } from "@/lib/absence-redistribution";
import { cleanupOldNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { buildSplitsData } from "@/lib/expense-splits";
import { calculateNextDueDate, formatPeriod } from "@/lib/service-utils";
import { expirePastEvents } from "@/lib/events/expire-events";
import { cleanupExpiredMobileAuthSessions } from "@/lib/mobile-auth";
import { deliverNotification, deliverNotificationToMembers } from "@/lib/push-delivery";
import { processRotations } from "@/lib/rotation-generator";
import { handleApiError } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export const maxDuration = 300;

/** Auto-generate invoices + expenses for services with autoGenerate=true and nextDueDate <= now. */
async function processServiceBilling(): Promise<{ generated: number; errors: number }> {
  const now = new Date();

  const dueServices = await prisma.service.findMany({
    where: {
      isActive: true,
      autoGenerate: true,
      lastAmount: { not: null },
      nextDueDate: { lte: now },
    },
  });

  let generated = 0;
  let errors = 0;

  for (const service of dueServices) {
    try {
      const amount = service.lastAmount!.toNumber();
      const splitsResult = await buildSplitsData({
        householdId: service.householdId,
        amount,
        splitType: service.splitType,
      });

      if (!splitsResult.ok) {
        errors++;
        continue;
      }

      const nextDueDate = calculateNextDueDate(
        service.frequency,
        service.nextDueDate,
        service.dayOfMonth,
        service.dayOfWeek,
      );

      const period = formatPeriod(service.nextDueDate);

      await prisma.$transaction(async (tx) => {
        const expense = await tx.expense.create({
          data: {
            householdId: service.householdId,
            paidById: service.paidById,
            title: service.title,
            amount: service.lastAmount!,
            currency: service.currency,
            category: service.category,
            splitType: service.splitType,
            notes: service.notes,
            splits: { create: splitsResult.data },
          },
        });

        await tx.invoice.create({
          data: {
            serviceId: service.id,
            householdId: service.householdId,
            period,
            amount: service.lastAmount!,
            dueDate: service.nextDueDate,
            status: "PAID",
            expenseId: expense.id,
          },
        });

        await tx.service.update({
          where: { id: service.id },
          data: { nextDueDate, lastGeneratedAt: now },
        });
      });

      generated++;
    } catch {
      errors++;
    }
  }

  return { generated, errors };
}

/**
 * processProactiveNotifications — creates 3 new proactive notification types:
 *   SERVICE_DUE_SOON, TASK_REMINDER, EXPENSE_WEEKLY_SUMMARY
 */
async function processProactiveNotifications(): Promise<{
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
        actionUrl: "/expenses",
        householdTimezone: hhTimezone?.timezone,
      });

      expenseWeeklySummary += hhMembers.length;
    }
  }

  return { serviceDueSoon, taskReminder, expenseWeeklySummary };
}

/**
 * processCulturalRecommendations — sends max 1 push/week per household
 * with the best-scored upcoming event in their city.
 */
async function processCulturalRecommendations(): Promise<number> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let sent = 0;

  const households = await prisma.household.findMany({
    where: {
      city: { not: null },
      members: { some: { isActive: true } },
    },
    select: { id: true, city: true, timezone: true },
  });

  for (const hh of households) {
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
      actionUrl: "/discover",
      householdTimezone: hh.timezone,
    });

    sent += members.length;
  }

  return sent;
}

/**
 * processDealAlerts — sends push for deals with >50% discount.
 * Max 3/week per household.
 */
async function processDealAlerts(): Promise<number> {
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
  }

  return sent;
}

/**
 * processMorningBriefing — sends a consolidated daily push at 8am per household timezone.
 * Dedup: max 1 DAILY_BRIEFING per household per day.
 */
async function processMorningBriefing(): Promise<number> {
  const now = new Date();
  let sent = 0;

  const households = await prisma.household.findMany({
    where: { members: { some: { isActive: true } } },
    select: { id: true, timezone: true },
  });

  for (const hh of households) {
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

    const [pendingToday, unsettledBalance, servicesDueSoon, topDeal] = await Promise.all([
      prisma.assignment.count({
        where: {
          householdId: hh.id,
          status: "PENDING",
          dueDate: { gte: now, lte: endOfLocalDay },
        },
      }),
      prisma.expenseSplit.aggregate({
        where: {
          settled: false,
          expense: { householdId: hh.id },
        },
        _sum: { amount: true },
      }),
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
    const balance = unsettledBalance._sum.amount?.toNumber() ?? 0;
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
      actionUrl: "/dashboard",
      householdTimezone: hh.timezone,
    });

    sent += members.length;
  }

  return sent;
}

/**
 * processOverdueTaskAlerts — sends TASK_OVERDUE push for assignments past due date.
 * Grace period: 4 hours after dueDate. Max 1 alert per assignment.
 */
async function processOverdueTaskAlerts(): Promise<number> {
  const now = new Date();
  const gracePeriod = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let sent = 0;

  const overdueAssignments = await prisma.assignment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: gracePeriod },
    },
    select: {
      id: true,
      memberId: true,
      householdId: true,
      task: { select: { name: true } },
    },
    take: 100,
  });

  for (const assignment of overdueAssignments) {
    // Dedup: skip if already sent TASK_OVERDUE for this assignment today
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        memberId: assignment.memberId,
        type: "TASK_OVERDUE",
        createdAt: { gte: startOfToday },
        metadata: { path: ["assignmentId"], equals: assignment.id },
      },
      select: { id: true },
    });

    if (alreadyNotified) continue;

    const household = await prisma.household.findUnique({
      where: { id: assignment.householdId },
      select: { timezone: true },
    });

    await deliverNotification({
      memberId: assignment.memberId,
      type: "TASK_OVERDUE",
      title: "Tarea vencida",
      message: `"${assignment.task.name}" está vencida. Completala cuando puedas.`,
      actionUrl: "/tasks",
      metadata: { assignmentId: assignment.id },
      householdTimezone: household?.timezone,
    });

    sent++;
  }

  return sent;
}

/**
 * processSpendingAnomalyAlerts — sends SPENDING_ALERT when monthly variable spending
 * exceeds 130% of the 3-month average. Max 1 per household per month.
 */
async function processSpendingAnomalyAlerts(): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start1MonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start2MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const start3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  let sent = 0;

  const households = await prisma.household.findMany({
    where: { members: { some: { isActive: true } } },
    select: { id: true, timezone: true },
  });

  for (const hh of households) {
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
  }

  return sent;
}

/**
 * POST /api/cron/process
 * Job programado: (1) redistribución por ausencias, (2) limpieza de notificaciones, (3) push reminders, (4) gastos recurrentes.
 * Protegido por CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [absenceResult, cleanupResult, billingResult, expireResult, mobileAuthCleanup, proactiveResult, culturalResult, dealResult, rotationResult, morningBriefingResult, overdueTaskResult, spendingAnomalyResult] = await Promise.all([
      processAbsenceRedistribution(),
      cleanupOldNotifications(),
      processServiceBilling(),
      expirePastEvents(),
      cleanupExpiredMobileAuthSessions(),
      processProactiveNotifications(),
      processCulturalRecommendations(),
      processDealAlerts(),
      processRotations(),
      processMorningBriefing(),
      processOverdueTaskAlerts(),
      processSpendingAnomalyAlerts(),
    ]);

    // Fire-and-forget: trigger events ingest and grocery-deals in background
    // Each gets its own serverless invocation to avoid timeout
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    after(async () => {
      try {
        await fetch(`${baseUrl}/api/cron/events/ingest`, {
          method: "POST",
          headers: { authorization: `Bearer ${cronSecret}` },
        });
      } catch (err) {
        console.error("[cron/process] Failed to trigger events/ingest:", err);
      }

      try {
        await fetch(`${baseUrl}/api/cron/grocery-deals`, {
          method: "POST",
          headers: { authorization: `Bearer ${cronSecret}` },
        });
      } catch (err) {
        console.error("[cron/process] Failed to trigger grocery-deals:", err);
      }
    });

    return NextResponse.json({
      success: true,
      absences: {
        processedAbsences: absenceResult.processedAbsences,
        reassigned: absenceResult.reassigned,
        postponed: absenceResult.postponed,
        errors: absenceResult.errors,
      },
      notifications: {
        deletedRead: cleanupResult.deletedRead,
        deletedUnread: cleanupResult.deletedUnread,
      },
      serviceBilling: {
        generated: billingResult.generated,
        errors: billingResult.errors,
      },
      events: {
        expiredEvents: expireResult.expiredEvents,
        deletedRestaurantCache: expireResult.deletedRestaurantCache,
      },
      mobileAuth: {
        revokedExpired: mobileAuthCleanup.revokedExpired,
        deletedOldRevoked: mobileAuthCleanup.deletedOldRevoked,
      },
      rotations: {
        processed: rotationResult.processed,
        generated: rotationResult.generated,
        errors: rotationResult.errors,
      },
      proactiveNotifications: {
        serviceDueSoon: proactiveResult.serviceDueSoon,
        taskReminder: proactiveResult.taskReminder,
        expenseWeeklySummary: proactiveResult.expenseWeeklySummary,
        culturalRecommendation: culturalResult,
        dealAlert: dealResult,
        morningBriefing: morningBriefingResult,
        overdueTaskAlerts: overdueTaskResult,
        spendingAnomalyAlerts: spendingAnomalyResult,
      },
      triggeredInBackground: ["events/ingest", "grocery-deals"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/cron/process", method: "POST" });
  }
}

/**
 * GET /api/cron/process
 * Estado del endpoint (monitoreo). Protegido por CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      status: "ready",
      endpoint: "POST /api/cron/process",
      description:
        "Redistribuye asignaciones por ausencias, limpia notificaciones y sesiones mobile expiradas, genera facturas de servicios, envía notificaciones proactivas",
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/cron/process", method: "GET" });
  }
}
