import { NextResponse } from "next/server";
import { processAbsenceRedistribution } from "@/lib/absence-redistribution";
import { cleanupOldNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { buildSplitsData } from "@/lib/expense-splits";
import { calculateNextDueDate, formatPeriod } from "@/lib/service-utils";
import { expirePastEvents } from "@/lib/events/expire-events";
import { cleanupExpiredMobileAuthSessions } from "@/lib/mobile-auth";
import { deliverNotification, deliverNotificationToMembers } from "@/lib/push-delivery";
import type { NextRequest } from "next/server";

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
 * POST /api/cron/process
 * Job programado: (1) redistribución por ausencias, (2) limpieza de notificaciones, (3) push reminders, (4) gastos recurrentes.
 * Protegido por CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [absenceResult, cleanupResult, billingResult, expireResult, mobileAuthCleanup, proactiveResult, culturalResult, dealResult] = await Promise.all([
      processAbsenceRedistribution(),
      cleanupOldNotifications(),
      processServiceBilling(),
      expirePastEvents(),
      cleanupExpiredMobileAuthSessions(),
      processProactiveNotifications(),
      processCulturalRecommendations(),
      processDealAlerts(),
    ]);

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
        deletedSuggestions: expireResult.deletedSuggestions,
      },
      mobileAuth: {
        revokedExpired: mobileAuthCleanup.revokedExpired,
        deletedOldRevoked: mobileAuthCleanup.deletedOldRevoked,
      },
      proactiveNotifications: {
        serviceDueSoon: proactiveResult.serviceDueSoon,
        taskReminder: proactiveResult.taskReminder,
        expenseWeeklySummary: proactiveResult.expenseWeeklySummary,
        culturalRecommendation: culturalResult,
        dealAlert: dealResult,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/cron/process error:", error);
    return NextResponse.json(
      { error: "Error processing cron job" },
      { status: 500 }
    );
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

  return NextResponse.json({
    status: "ready",
    endpoint: "POST /api/cron/process",
    description:
      "Redistribuye asignaciones por ausencias, limpia notificaciones y sesiones mobile expiradas, genera facturas de servicios, envía notificaciones proactivas",
  });
}
