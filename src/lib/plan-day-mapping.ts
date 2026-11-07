/**
 * Maps an AI-generated plan's dayOfWeek (1=Mon..7=Sun, 0 treated as Sunday)
 * to a concrete due date relative to the plan's reference date (its week start).
 * Falls back to end-of-today when dayOfWeek is missing or out of range,
 * and pushes past dates to today to avoid creating already-overdue assignments.
 */
export function computeDueDateForDayOfWeek(
  dayOfWeek: number | undefined,
  referenceDate: Date,
  now: Date,
): Date {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (dayOfWeek === undefined) {
    return endOfToday;
  }

  const normalizedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  if (normalizedDay < 1 || normalizedDay > 7) {
    return endOfToday;
  }

  const dueDate = new Date(referenceDate);
  dueDate.setDate(referenceDate.getDate() + normalizedDay - 1);
  dueDate.setHours(23, 59, 59, 999);

  if (dueDate < now) {
    return endOfToday;
  }

  return dueDate;
}
