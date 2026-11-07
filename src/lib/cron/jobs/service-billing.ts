import { prisma } from "@/lib/prisma";
import { buildSplitsData } from "@/lib/expense-splits";
import { calculateNextDueDate, formatPeriod } from "@/lib/service-utils";

/** Auto-generate invoices + expenses for services with autoGenerate=true and nextDueDate <= now. */
export async function processServiceBilling(): Promise<{ generated: number; errors: number }> {
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
