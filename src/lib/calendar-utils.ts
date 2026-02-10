/** Get the Monday (start of ISO week) for the given date */
export function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Sunday = 0, so shift it to 7 for the Monday-start calculation
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get Sunday 23:59:59 from a given Monday */
export function getWeekSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Generate array of 7 Date objects [Mon, Tue, ..., Sun] */
export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

/** Format a week range as "10 Feb – 16 Feb 2026" */
export function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const startStr = monday.toLocaleDateString("es", opts);

  const sameMonth =
    monday.getMonth() === sunday.getMonth() &&
    monday.getFullYear() === sunday.getFullYear();

  const endStr = sameMonth
    ? sunday.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
    : sunday.toLocaleDateString("es", { ...opts, year: "numeric" });

  // If different months, include full format on both sides
  const formattedStart = sameMonth
    ? monday.toLocaleDateString("es", { day: "numeric" })
    : startStr;

  return `${formattedStart} – ${endStr}`;
}

const DAY_NAMES_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Format a date as { dayName: "Lun", dayNumber: 10 } */
export function formatDayHeader(date: Date): { dayName: string; dayNumber: number } {
  const day = date.getDay();
  // Convert JS day (0=Sun) to ISO index (0=Mon)
  const isoIndex = day === 0 ? 6 : day - 1;
  return {
    dayName: DAY_NAMES_SHORT[isoIndex] ?? "?",
    dayNumber: date.getDate(),
  };
}

/** Check if two dates fall on the same calendar day */
export function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}
