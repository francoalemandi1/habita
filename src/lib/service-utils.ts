import type { RecurringFrequency } from "@prisma/client";

/**
 * Calculate the next due date for a service based on frequency.
 * Advances from `fromDate` to the next occurrence.
 */
export function calculateNextDueDate(
  frequency: RecurringFrequency,
  fromDate: Date,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
): Date {
  const next = new Date(fromDate);

  switch (frequency) {
    case "WEEKLY": {
      next.setDate(next.getDate() + 7);
      if (dayOfWeek != null) {
        const currentDay = next.getDay();
        const daysUntil = (dayOfWeek - currentDay + 7) % 7;
        next.setDate(next.getDate() + (daysUntil === 0 ? 7 : daysUntil));
      }
      break;
    }
    case "MONTHLY": {
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth != null) {
        next.setDate(Math.min(dayOfMonth, daysInMonth(next)));
      }
      break;
    }
    case "BIMONTHLY": {
      next.setMonth(next.getMonth() + 2);
      if (dayOfMonth != null) {
        next.setDate(Math.min(dayOfMonth, daysInMonth(next)));
      }
      break;
    }
    case "QUARTERLY": {
      next.setMonth(next.getMonth() + 3);
      if (dayOfMonth != null) {
        next.setDate(Math.min(dayOfMonth, daysInMonth(next)));
      }
      break;
    }
    case "YEARLY": {
      next.setFullYear(next.getFullYear() + 1);
      if (dayOfMonth != null) {
        next.setDate(Math.min(dayOfMonth, daysInMonth(next)));
      }
      break;
    }
  }

  return next;
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Human-readable label for a recurring frequency. */
export function frequencyLabel(frequency: RecurringFrequency): string {
  const labels: Record<RecurringFrequency, string> = {
    WEEKLY: "Semanal",
    MONTHLY: "Mensual",
    BIMONTHLY: "Bimestral",
    QUARTERLY: "Trimestral",
    YEARLY: "Anual",
  };
  return labels[frequency];
}

/** Format a date's period as YYYY-MM string. */
export function formatPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
