import { NextResponse } from "next/server";
import { processAbsenceRedistribution } from "@/lib/absence-redistribution";
import { cleanupOldNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { buildSplitsData } from "@/lib/expense-splits";
import { calculateNextDueDate, formatPeriod } from "@/lib/service-utils";
import { expirePastEvents } from "@/lib/events/expire-events";
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

    const [absenceResult, cleanupResult, billingResult, expireResult] = await Promise.all([
      processAbsenceRedistribution(),
      cleanupOldNotifications(),
      processServiceBilling(),
      expirePastEvents(),
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
      "Redistribuye asignaciones por ausencias activas, limpia notificaciones antiguas y genera facturas de servicios",
  });
}
