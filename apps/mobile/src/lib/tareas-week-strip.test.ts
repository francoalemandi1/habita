import { describe, expect, it } from "vitest";
import { buildWeekStrip, dayKey } from "./tareas-week-strip";

describe("buildWeekStrip", () => {
  it("builds Monday→Sunday for the week containing `now`", () => {
    // Wednesday, Nov 5 2025
    const now = new Date(2025, 10, 5);
    const days = buildWeekStrip(now, []);

    expect(days).toHaveLength(7);
    expect(days[0]!.label).toBe("Lun");
    expect(days[0]!.dayNumber).toBe(3);
    expect(days[6]!.label).toBe("Dom");
    expect(days[6]!.dayNumber).toBe(9);
  });

  it("marks `now`'s day as today", () => {
    const now = new Date(2025, 10, 5);
    const days = buildWeekStrip(now, []);

    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(days.find((d) => d.isToday)?.key).toBe(dayKey(now));
  });

  it("rolls Sunday into the previous week (not the next)", () => {
    const sunday = new Date(2025, 10, 9);
    const days = buildWeekStrip(sunday, []);

    expect(days[0]!.dayNumber).toBe(3);
    expect(days[6]!.dayNumber).toBe(9);
    expect(days[6]!.isToday).toBe(true);
  });

  it("flags days present in assignmentDueDateKeys", () => {
    const now = new Date(2025, 10, 5);
    const days = buildWeekStrip(now, [dayKey(new Date(2025, 10, 3)), dayKey(new Date(2025, 10, 7))]);

    expect(days[0]!.hasTasks).toBe(true);
    expect(days[1]!.hasTasks).toBe(false);
    expect(days[4]!.hasTasks).toBe(true);
  });
});
