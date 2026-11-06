/** Pure helpers to group Tareas "Semana" assignments by due day (handoff §5.3). */

import { dayKey } from "./tareas-week-strip";

const WEEKDAY_UPPER = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

/** "HOY · MARTES 3" for today, "MARTES 3" otherwise. */
export function formatDayGroupLabel(date: Date, isToday: boolean): string {
  const base = `${WEEKDAY_UPPER[date.getDay()]} ${date.getDate()}`;
  return isToday ? `HOY · ${base}` : base;
}

export interface DayGroup<T> {
  key: string;
  date: Date;
  items: T[];
}

/** Groups items by their `dueDate` into ascending-date buckets. */
export function groupByDueDate<T extends { dueDate: string }>(items: readonly T[]): DayGroup<T>[] {
  const buckets = new Map<string, DayGroup<T>>();

  for (const item of items) {
    const date = new Date(item.dueDate);
    const key = dayKey(date);
    const existing = buckets.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      buckets.set(key, { key, date, items: [item] });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}
