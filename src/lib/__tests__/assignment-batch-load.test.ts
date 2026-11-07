import { describe, it, expect } from "vitest";
import { pickAssigneesForBatch } from "../assignment-algorithm";

import type { TaskPlannerSnapshot, PlannerTask } from "@habita/domain";

function buildTask(id: string, minAge: number | null = null): PlannerTask {
  return {
    id,
    name: id,
    frequency: "DAILY",
    weight: 1,
    minAge,
    estimatedMinutes: null,
  };
}

describe("pickAssigneesForBatch", () => {
  it("splits 4 equal tasks 2/2 across 2 members with no prior load", () => {
    const now = new Date(2026, 0, 5);

    const snapshot: TaskPlannerSnapshot = {
      members: [
        { id: "m1", name: "Ana", memberType: "ADULT", absences: [] },
        { id: "m2", name: "Bruno", memberType: "ADULT", absences: [] },
      ],
      preferences: [],
      recentAssignments: [],
      tasks: [buildTask("t1"), buildTask("t2"), buildTask("t3"), buildTask("t4")],
    };

    const tasks = [
      { id: "t1", name: "Lavar platos", frequency: "DAILY" },
      { id: "t2", name: "Barrer", frequency: "DAILY" },
      { id: "t3", name: "Sacar basura", frequency: "DAILY" },
      { id: "t4", name: "Tender ropa", frequency: "DAILY" },
    ];

    const picks = pickAssigneesForBatch(snapshot, tasks, now);

    expect(picks).toHaveLength(4);
    const countByMember = new Map<string, number>();
    for (const pick of picks) {
      countByMember.set(pick.memberId, (countByMember.get(pick.memberId) ?? 0) + 1);
    }
    expect(countByMember.get("m1")).toBe(2);
    expect(countByMember.get("m2")).toBe(2);
  });

  it("skips a task when no member is eligible", () => {
    const now = new Date(2026, 0, 5);
    const snapshot: TaskPlannerSnapshot = {
      members: [],
      preferences: [],
      recentAssignments: [],
      tasks: [buildTask("t1")],
    };

    const picks = pickAssigneesForBatch(
      snapshot,
      [{ id: "t1", name: "Tarea", frequency: "DAILY" }],
      now,
    );

    expect(picks).toHaveLength(0);
  });
});
