/**
 * Timezone-aware date boundary utilities.
 * Used by dashboard and briefing to compute "today" in the household's timezone.
 */

export function getLocalDateString(date: Date, timezone?: string | null): string {
  try {
    if (timezone) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    }
  } catch {
    // Fall through
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface DateBoundaries {
  startOfToday: Date;
  endOfToday: Date;
}

interface DateBoundariesWithYesterday extends DateBoundaries {
  startOfYesterday: Date;
}

/**
 * Get start-of-today and end-of-today in UTC, adjusted for the household's timezone.
 */
export function getDayBoundaries(timezone?: string | null): DateBoundaries {
  const now = new Date();
  const localDateStr = getLocalDateString(now, timezone);
  const [yearStr, monthStr, dayStr] = localDateStr.split("-");
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1;
  const day = parseInt(dayStr!, 10);

  if (timezone) {
    try {
      const localMidnight = new Date(Date.UTC(year, month, day));
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        hour12: false,
      }).formatToParts(localMidnight);
      const formattedHour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
      const offsetHours = formattedHour > 12 ? formattedHour - 24 : formattedHour;
      const startOfToday = new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
      return { startOfToday, endOfToday };
    } catch {
      // Fall through
    }
  }

  const startOfToday = new Date(year, month, day, 0, 0, 0, 0);
  const endOfToday = new Date(year, month, day, 23, 59, 59, 999);
  return { startOfToday, endOfToday };
}

/**
 * Extended version that also returns startOfYesterday (used by briefing).
 */
export function getDayBoundariesWithYesterday(timezone?: string | null): DateBoundariesWithYesterday {
  const { startOfToday, endOfToday } = getDayBoundaries(timezone);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  return { startOfYesterday, startOfToday, endOfToday };
}
