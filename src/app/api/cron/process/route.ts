import { NextResponse } from "next/server";
import { processAbsenceRedistribution } from "@/lib/absence-redistribution";
import { cleanupOldNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { buildSplitsData } from "@/lib/expense-splits";
import { calculateNextDueDate } from "@/lib/recurring-expense-utils";
import type { NextRequest } from "next/server";

/** Auto-generate expenses for recurring templates with autoGenerate=true and nextDueDate <= now. */
async function processRecurringExpenses(): Promise<{ generated: number; errors: number }> {
  const now = new Date();

  const dueTemplates = await prisma.recurringExpense.findMany({
    where: {
      isActive: true,
      autoGenerate: true,
      nextDueDate: { lte: now },
    },
  });

  let generated = 0;
  let errors = 0;

  for (const template of dueTemplates) {
    try {
      const splitsResult = await buildSplitsData({
        householdId: template.householdId,
        amount: template.amount.toNumber(),
        splitType: template.splitType,
      });

      if (!splitsResult.ok) {
        errors++;
        continue;
      }

      const nextDueDate = calculateNextDueDate(
        template.frequency,
        template.nextDueDate,
        template.dayOfMonth,
        template.dayOfWeek,
      );

      await prisma.$transaction([
        prisma.expense.create({
          data: {
            householdId: template.householdId,
            paidById: template.paidById,
            title: template.title,
            amount: template.amount,
            currency: template.currency,
            category: template.category,
            splitType: template.splitType,
            notes: template.notes,
            splits: { create: splitsResult.data },
          },
        }),
        prisma.recurringExpense.update({
          where: { id: template.id },
          data: { nextDueDate, lastGeneratedAt: now },
        }),
      ]);

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

    const [absenceResult, cleanupResult, recurringResult] = await Promise.all([
      processAbsenceRedistribution(),
      cleanupOldNotifications(),
      processRecurringExpenses(),
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
      recurringExpenses: {
        generated: recurringResult.generated,
        errors: recurringResult.errors,
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
      "Redistribuye asignaciones por ausencias activas, limpia notificaciones antiguas y genera gastos recurrentes",
  });
}
