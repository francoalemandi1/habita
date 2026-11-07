import { describe, expect, it } from "vitest";
import { buildMinutesByTaskName, formatPlanMinutes, getPlanWeekRange, groupPlanByMember, sumPlanMinutes } from "./tareas-plan";

import type { PlanAssignment } from "@habita/contracts";

function assignment(overrides: Partial<PlanAssignment>): PlanAssignment {
  return { taskName: "Lavar platos", memberId: "m1", memberName: "Juli", memberType: "ADULT", reason: "", ...overrides };
}

describe("getPlanWeekRange", () => {
  it("spans 7 days starting from `now`", () => {
    const now = new Date(2025, 10, 3);
    const { startDate, endDate } = getPlanWeekRange(now);

    expect(new Date(startDate).getDate()).toBe(3);
    expect(new Date(endDate).getDate()).toBe(9);
  });
});

describe("groupPlanByMember", () => {
  it("groups assignments by memberId", () => {
    const assignments = [
      assignment({ memberId: "m1", taskName: "Lavar platos" }),
      assignment({ memberId: "m2", taskName: "Sacar la basura" }),
      assignment({ memberId: "m1", taskName: "Barrer" }),
    ];

    const grouped = groupPlanByMember(assignments);

    expect(grouped.get("m1")?.map((a) => a.taskName)).toEqual(["Lavar platos", "Barrer"]);
    expect(grouped.get("m2")?.map((a) => a.taskName)).toEqual(["Sacar la basura"]);
  });
});

describe("buildMinutesByTaskName / sumPlanMinutes", () => {
  it("skips tasks without an estimate", () => {
    const minutesByTaskName = buildMinutesByTaskName([
      { name: "Lavar platos", estimatedMinutes: 20 },
      { name: "Barrer", estimatedMinutes: null },
      { name: "Sacar la basura" },
    ]);

    expect(minutesByTaskName.get("Lavar platos")).toBe(20);
    expect(minutesByTaskName.has("Barrer")).toBe(false);
    expect(minutesByTaskName.has("Sacar la basura")).toBe(false);
  });

  it("sums only the tasks that have an estimate", () => {
    const minutesByTaskName = buildMinutesByTaskName([
      { name: "Lavar platos", estimatedMinutes: 20 },
      { name: "Barrer", estimatedMinutes: 60 },
    ]);
    const assignments = [
      assignment({ taskName: "Lavar platos" }),
      assignment({ taskName: "Barrer" }),
      assignment({ taskName: "Sin estimar" }),
    ];

    expect(sumPlanMinutes(assignments, minutesByTaskName)).toBe(80);
  });
});

describe("formatPlanMinutes", () => {
  it("returns null when there's nothing to show", () => {
    expect(formatPlanMinutes(0)).toBeNull();
  });

  it("formats minutes-only totals", () => {
    expect(formatPlanMinutes(45)).toBe("45 min");
  });

  it("formats whole-hour totals", () => {
    expect(formatPlanMinutes(60)).toBe("1 h");
  });

  it("formats hour + minutes totals", () => {
    expect(formatPlanMinutes(80)).toBe("1 h 20 min");
  });
});
