export interface QuietHoursWindow {
  start: number; // 0-23
  end: number; // 0-23
  hour: number; // 0-23, the hour to check
}

/**
 * Whether `hour` falls inside the [start, end) quiet-hours window.
 * Handles windows that cross midnight, e.g. start=23, end=8.
 */
export function isWithinQuietHours({ start, end, hour }: QuietHoursWindow): boolean {
  if (start === end) return false;
  if (start < end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}
