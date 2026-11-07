import { describe, expect, it } from "vitest";
import { computeMemberDayLoad } from "./tareas-day-load";

describe("computeMemberDayLoad", () => {
  it("counts only assignments due on the given day, per member", () => {
    const assignments = [
      { memberId: "m1", dueDate: "2025-11-05T09:00:00.000Z" },
      { memberId: "m1", dueDate: "2025-11-05T20:00:00.000Z" },
      { memberId: "m2", dueDate: "2025-11-05T09:00:00.000Z" },
      { memberId: "m1", dueDate: "2025-11-06T09:00:00.000Z" },
    ];

    expect(computeMemberDayLoad(assignments, "2025-11-05")).toEqual({ m1: 2, m2: 1 });
  });

  it("returns an empty object when nobody has load that day", () => {
    expect(computeMemberDayLoad([], "2025-11-05")).toEqual({});
  });
});
