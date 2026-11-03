import { describe, it, expect } from "vitest";
import { pickAssigneesForBatch } from "../assignment-algorithm";

import type { BatchScoreContext } from "../assignment-algorithm";
import type { Task } from "@prisma/client";

function buildTask(id: string, minAge: number | null = null): Task {
  return {
    id,
    name: id,
    minAge,
  } as Task;
}

describe("pickAssigneesForBatch", () => {
  it("splits 4 equal tasks 2/2 across 2 members with no prior load", () => {
    const now = new Date(2026, 0, 5);

    const context: BatchScoreContext = {
      members: [
        { id: "m1", name: "Ana", memberType: "ADULT", preferences: [], assignments: [], absences: [] },
        { id: "m2", name: "Bruno", memberType: "ADULT", preferences: [], assignments: [], absences: [] },
      ],
      lastAssignmentsByTask: new Map(),
      tasks: [buildTask("t1"), buildTask("t2"), buildTask("t3"), buildTask("t4")],
    };

    const tasks = [
      { id: "t1", name: "Lavar platos", frequency: "DAILY" },
      { id: "t2", name: "Barrer", frequency: "DAILY" },
      { id: "t3", name: "Sacar basura", frequency: "DAILY" },
      { id: "t4", name: "Tender ropa", frequency: "DAILY" },
    ];

    const picks = pickAssigneesForBatch(context, tasks, now);

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
    const context: BatchScoreContext = {
      members: [],
      lastAssignmentsByTask: new Map(),
      tasks: [buildTask("t1")],
    };

    const picks = pickAssigneesForBatch(
      context,
      [{ id: "t1", name: "Tarea", frequency: "DAILY" }],
      now,
    );

    expect(picks).toHaveLength(0);
  });
});
