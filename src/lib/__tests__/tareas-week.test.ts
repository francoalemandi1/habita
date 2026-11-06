import { describe, expect, it } from "vitest";
import {
  buildAssignmentPatch,
  computeMemberDayLoadMinutes,
  encodeDropTargetId,
  formatTaskCardMeta,
  groupAssignmentsByDay,
  parseDropTargetId,
} from "../tareas-week";

describe("groupAssignmentsByDay", () => {
  it("buckets assignments by matching calendar day, keeping the days order", () => {
    const monday = new Date(2026, 1, 9);
    const tuesday = new Date(2026, 1, 10);
    const assignments = [
      { id: "a", dueDate: monday, task: { estimatedMinutes: 10, frequency: "WEEKLY" } },
      { id: "b", dueDate: tuesday, task: { estimatedMinutes: 5, frequency: "DAILY" } },
    ];

    const buckets = groupAssignmentsByDay(assignments, [monday, tuesday]);

    expect(buckets[0]?.map((a) => a.id)).toEqual(["a"]);
    expect(buckets[1]?.map((a) => a.id)).toEqual(["b"]);
  });
});

describe("computeMemberDayLoadMinutes", () => {
  it("sums only the given member's tasks on the given day", () => {
    const day = new Date(2026, 1, 9);
    const assignments = [
      { id: "a", memberId: "me", dueDate: day, task: { estimatedMinutes: 10, frequency: "WEEKLY" } },
      { id: "b", memberId: "other", dueDate: day, task: { estimatedMinutes: 20, frequency: "WEEKLY" } },
      { id: "c", memberId: "me", dueDate: day, task: { estimatedMinutes: 5, frequency: "WEEKLY" } },
    ];

    expect(computeMemberDayLoadMinutes(assignments, "me", day)).toBe(15);
  });

  it("treats a missing estimate as zero minutes", () => {
    const day = new Date(2026, 1, 9);
    const assignments = [{ id: "a", memberId: "me", dueDate: day, task: { estimatedMinutes: null, frequency: "WEEKLY" } }];

    expect(computeMemberDayLoadMinutes(assignments, "me", day)).toBe(0);
  });
});

describe("formatTaskCardMeta", () => {
  it("shows the transfer hint when one is pending, ignoring minutes/frequency", () => {
    expect(formatTaskCardMeta({ estimatedMinutes: 10, frequency: "DAILY" }, "Tomi")).toBe("Pedido a Tomi");
  });

  it("joins minutes and frequency when there is no pending transfer", () => {
    expect(formatTaskCardMeta({ estimatedMinutes: 15, frequency: "WEEKLY" }, null)).toBe("15 min · Semanal");
  });

  it("omits minutes when the task has none estimated", () => {
    expect(formatTaskCardMeta({ estimatedMinutes: null, frequency: "MONTHLY" }, null)).toBe("Mensual");
  });
});

describe("drop target encode/parse", () => {
  it("round-trips a day target", () => {
    const id = encodeDropTargetId({ kind: "day", date: "2026-02-10" });
    expect(parseDropTargetId(id)).toEqual({ kind: "day", date: "2026-02-10" });
  });

  it("round-trips a member target", () => {
    const id = encodeDropTargetId({ kind: "member", memberId: "member-1" });
    expect(parseDropTargetId(id)).toEqual({ kind: "member", memberId: "member-1" });
  });

  it("returns null for an unrecognized id", () => {
    expect(parseDropTargetId("task-card-1")).toBeNull();
  });
});

describe("buildAssignmentPatch", () => {
  it("builds a dueDate patch for a day target", () => {
    expect(buildAssignmentPatch({ kind: "day", date: "2026-02-10" })).toEqual({ dueDate: "2026-02-10" });
  });

  it("builds a memberId patch for a member target", () => {
    expect(buildAssignmentPatch({ kind: "member", memberId: "member-1" })).toEqual({ memberId: "member-1" });
  });
});
