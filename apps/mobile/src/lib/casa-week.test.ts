import { describe, expect, it } from "vitest";
import { filterDueToday, getHouseholdWeekRange, isAssignmentOpen, toCheckboxState } from "./casa-week";

import type { AssignmentSummary } from "@habita/contracts";

function buildAssignment(overrides: Partial<AssignmentSummary>): AssignmentSummary {
  return {
    id: "a1",
    taskId: "t1",
    memberId: "m1",
    householdId: "h1",
    dueDate: new Date().toISOString(),
    status: "PENDING",
    task: { id: "t1", name: "Lavar platos", weight: 1, frequency: "DAILY" },
    ...overrides,
  };
}

describe("getHouseholdWeekRange", () => {
  it("returns Monday 00:00 to Sunday 23:59:59.999 for a Tuesday", () => {
    const tuesday = new Date(2026, 10, 3); // Nov 3 2026 is a Tuesday
    const { from, to } = getHouseholdWeekRange(tuesday);
    expect(new Date(from).getDay()).toBe(1);
    expect(new Date(to).getDay()).toBe(0);
    expect(new Date(from).getDate()).toBe(2);
    expect(new Date(to).getDate()).toBe(8);
  });

  it("treats Sunday as the end of its own week", () => {
    const sunday = new Date(2026, 10, 8);
    const { from, to } = getHouseholdWeekRange(sunday);
    expect(new Date(from).getDate()).toBe(2);
    expect(new Date(to).getDate()).toBe(8);
  });
});

describe("filterDueToday", () => {
  it("keeps only assignments due on the given day", () => {
    const now = new Date(2026, 10, 3, 9, 0, 0);
    const today = buildAssignment({ id: "today", dueDate: new Date(2026, 10, 3, 18, 0).toISOString() });
    const tomorrow = buildAssignment({ id: "tomorrow", dueDate: new Date(2026, 10, 4).toISOString() });
    expect(filterDueToday([today, tomorrow], now)).toEqual([today]);
  });

  it("excludes cancelled assignments due today", () => {
    const now = new Date(2026, 10, 3);
    const cancelled = buildAssignment({ dueDate: now.toISOString(), status: "CANCELLED" });
    expect(filterDueToday([cancelled], now)).toEqual([]);
  });
});

describe("isAssignmentOpen", () => {
  it("is false for done or cancelled statuses", () => {
    expect(isAssignmentOpen(buildAssignment({ status: "COMPLETED" }))).toBe(false);
    expect(isAssignmentOpen(buildAssignment({ status: "VERIFIED" }))).toBe(false);
    expect(isAssignmentOpen(buildAssignment({ status: "CANCELLED" }))).toBe(false);
  });

  it("is true for pending or in-progress statuses", () => {
    expect(isAssignmentOpen(buildAssignment({ status: "PENDING" }))).toBe(true);
    expect(isAssignmentOpen(buildAssignment({ status: "IN_PROGRESS" }))).toBe(true);
  });
});

describe("toCheckboxState", () => {
  it("maps PENDING/IN_PROGRESS to pending", () => {
    expect(toCheckboxState("PENDING", false)).toBe("pending");
    expect(toCheckboxState("IN_PROGRESS", false)).toBe("pending");
  });

  it("maps COMPLETED to done when verification is not required", () => {
    expect(toCheckboxState("COMPLETED", false)).toBe("done");
  });

  it("maps COMPLETED to toVerify when verification is required", () => {
    expect(toCheckboxState("COMPLETED", true)).toBe("toVerify");
  });

  it("maps VERIFIED to done regardless of verification requirement", () => {
    expect(toCheckboxState("VERIFIED", true)).toBe("done");
  });
});
