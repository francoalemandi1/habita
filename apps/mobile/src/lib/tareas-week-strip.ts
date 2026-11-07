/** Pure helpers for the Tareas "Semana" 7-day strip (handoff §5.3). */

export interface WeekStripDay {
  date: Date;
  key: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
  hasTasks: boolean;
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Mon→Sun strip for the week containing `now`, with a dot for days that have assignments. */
export function buildWeekStrip(now: Date, assignmentDueDateKeys: readonly string[]): WeekStripDay[] {
  const todayKey = dayKey(now);
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  const taskDays = new Set(assignmentDueDateKeys);

  const days: WeekStripDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = dayKey(date);
    days.push({
      date,
      key,
      label: DAY_LABELS[i]!,
      dayNumber: date.getDate(),
      isToday: key === todayKey,
      hasTasks: taskDays.has(key),
    });
  }
  return days;
}
