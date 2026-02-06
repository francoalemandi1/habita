import type { TaskFrequency } from "@prisma/client";

/**
 * Calcula la fecha de vencimiento para una asignación según la frecuencia.
 * Especificación: daily = fin del día actual, weekly = +7 días, biweekly = +14, monthly = +30.
 * "Fin del día" = 23:59:59.999 en la fecha resultante.
 *
 * If `planEndDate` is provided, the due date is capped so it never exceeds the plan end.
 */
export function computeDueDateForFrequency(
  frequency: TaskFrequency,
  fromDate?: Date,
  planEndDate?: Date
): Date {
  const from = fromDate ? new Date(fromDate) : new Date();
  from.setHours(0, 0, 0, 0);

  const due = new Date(from);

  switch (frequency) {
    case "DAILY":
      due.setHours(23, 59, 59, 999);
      break;
    case "WEEKLY":
      due.setDate(due.getDate() + 7);
      due.setHours(23, 59, 59, 999);
      break;
    case "BIWEEKLY":
      due.setDate(due.getDate() + 14);
      due.setHours(23, 59, 59, 999);
      break;
    case "MONTHLY":
      due.setMonth(due.getMonth() + 1);
      due.setHours(23, 59, 59, 999);
      break;
    case "ONCE":
      due.setHours(23, 59, 59, 999);
      break;
    default:
      due.setDate(due.getDate() + 7);
      due.setHours(23, 59, 59, 999);
  }

  // Cap at plan end date if provided
  if (planEndDate && due > planEndDate) {
    const capped = new Date(planEndDate);
    capped.setHours(23, 59, 59, 999);
    return capped;
  }

  return due;
}
