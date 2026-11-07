import { describe, expect, it } from "vitest";
import {
  partitionTasksByDuration,
  pickNextAssignee,
  pickNextRotationAssignee,
  planWeek,
  scoreCandidates,
} from "@habita/domain";

import type { PlannerMember, PlannerTask, TaskPlannerSnapshot } from "@habita/domain";

function member(id: string, memberType: PlannerMember["memberType"] = "ADULT"): PlannerMember {
  return { id, name: id, memberType, absences: [] };
}

function task(id: string, overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id,
    name: id,
    frequency: "WEEKLY",
    weight: 1,
    minAge: null,
    estimatedMinutes: null,
    ...overrides,
  };
}

function snapshot(overrides: Partial<TaskPlannerSnapshot> = {}): TaskPlannerSnapshot {
  return { members: [], tasks: [], preferences: [], recentAssignments: [], ...overrides };
}

const now = new Date(2026, 0, 5); // Monday

describe("scoreCandidates", () => {
  it("adds 20 for a preferred task and subtracts 20 for a disliked task", () => {
    const t = task("t1");
    const snap = snapshot({
      members: [member("a"), member("b")],
      preferences: [
        { memberId: "a", taskId: "t1", preference: "PREFERRED" },
        { memberId: "b", taskId: "t1", preference: "DISLIKED" },
      ],
    });
    const scores = scoreCandidates(t, now, snap, now);
    const byId = new Map(scores.map((s) => [s.memberId, s.score]));
    expect(byId.get("a")! - byId.get("b")!).toBe(40);
  });

  it("subtracts 5 per pending assignment", () => {
    const t = task("t1");
    const snap = snapshot({
      members: [member("a"), member("b")],
      recentAssignments: [
        { taskId: "other", memberId: "a", dueDate: now, status: "PENDING", completedAt: null },
        { taskId: "other2", memberId: "a", dueDate: now, status: "IN_PROGRESS", completedAt: null },
      ],
    });
    const scores = scoreCandidates(t, now, snap, now);
    const byId = new Map(scores.map((s) => [s.memberId, s.score]));
    expect(byId.get("b")! - byId.get("a")!).toBe(10);
  });

  it("gives recency bonus capped at 14 days, and +14 when never done", () => {
    const t = task("t1");
    const snap = snapshot({
      members: [member("a"), member("b")],
      recentAssignments: [
        {
          taskId: "t1",
          memberId: "a",
          dueDate: now,
          status: "COMPLETED",
          completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        },
      ],
    });
    const scores = scoreCandidates(t, now, snap, now);
    const byId = new Map(scores.map((s) => [s.memberId, s.score]));
    // b never did it: +14. a did it 3 days ago: +3. Difference should be 11.
    expect(byId.get("b")! - byId.get("a")!).toBe(11);
  });

  it("applies capacity multiplier by member type", () => {
    const t = task("t1");
    const snap = snapshot({ members: [member("adult", "ADULT"), member("teen", "TEEN"), member("child", "CHILD")] });
    const scores = scoreCandidates(t, now, snap, now);
    const byId = new Map(scores.map((s) => [s.memberId, s.score]));
    expect(byId.get("adult")).toBe(Math.round(114 * 1.0));
    expect(byId.get("teen")).toBe(Math.round(114 * 0.6));
    expect(byId.get("child")).toBe(Math.round(114 * 0.3));
  });

  it("excludes a member below the task's minimum age", () => {
    const t = task("t1", { minAge: 13 });
    const snap = snapshot({ members: [member("adult", "ADULT"), member("child", "CHILD")] });
    const scores = scoreCandidates(t, now, snap, now);
    expect(scores.map((s) => s.memberId)).toEqual(["adult"]);
  });

  it("excludes a member absent on the target date", () => {
    const t = task("t1");
    const snap = snapshot({
      members: [
        { id: "a", name: "a", memberType: "ADULT", absences: [{ startDate: now, endDate: now }] },
        member("b"),
      ],
    });
    const scores = scoreCandidates(t, now, snap, now);
    expect(scores.map((s) => s.memberId)).toEqual(["b"]);
  });

  it("excludes a member whose availability marks the target weekday as unavailable", () => {
    const t = task("t1");
    const monday = new Date(2026, 0, 5); // ISO weekday 1
    const snap = snapshot({
      members: [
        { id: "a", name: "a", memberType: "ADULT", absences: [], unavailableWeekdays: [1] },
        member("b"),
      ],
    });
    const scores = scoreCandidates(t, monday, snap, now);
    expect(scores.map((s) => s.memberId)).toEqual(["b"]);
  });

  it("is deterministic: identical input produces identical output", () => {
    const t = task("t1");
    const snap = snapshot({
      members: [member("a"), member("b"), member("c")],
      preferences: [{ memberId: "b", taskId: "t1", preference: "PREFERRED" }],
    });
    const first = scoreCandidates(t, now, snap, now);
    const second = scoreCandidates(t, now, snap, now);
    expect(first).toEqual(second);
  });

  it("never mutates the input snapshot", () => {
    const t = task("t1");
    const snap = snapshot({ members: [member("a"), member("b")] });
    const snapshotCopy = JSON.parse(JSON.stringify(snap));
    scoreCandidates(t, now, snap, now);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snapshotCopy);
  });
});

describe("pickNextAssignee", () => {
  it("falls back to adults-only when the minimum age excludes every member", () => {
    const t = task("t1", { minAge: 18 });
    const snap = snapshot({ members: [member("adult", "ADULT"), member("teen", "TEEN")] });
    const best = pickNextAssignee(t, now, snap, now);
    expect(best?.memberId).toBe("adult");
  });

  it("returns null when nobody is eligible even after the adults-only retry", () => {
    const t = task("t1", { minAge: 18 });
    const snap = snapshot({ members: [member("teen", "TEEN"), member("child", "CHILD")] });
    expect(pickNextAssignee(t, now, snap, now)).toBeNull();
  });
});

describe("partitionTasksByDuration", () => {
  it("excludes tasks whose frequency exceeds the plan duration", () => {
    const tasks = [task("daily", { frequency: "DAILY" }), task("monthly", { frequency: "MONTHLY" })];
    const { included, excluded } = partitionTasksByDuration(tasks, 7);
    expect(included.map((t) => t.id)).toEqual(["daily"]);
    expect(excluded.map((t) => t.id)).toEqual(["monthly"]);
  });
});

describe("planWeek", () => {
  it("produces a 7-day plan where no single member gets every task", () => {
    const tasks = Array.from({ length: 6 }, (_, i) => task(`t${i}`, { frequency: "WEEKLY" }));
    const snap = snapshot({ members: [member("a"), member("b"), member("c")], tasks });
    const result = planWeek({ snapshot: snap, startDate: now, durationDays: 7, now });

    const countByMember = new Map<string, number>();
    for (const a of result.assignments) {
      countByMember.set(a.memberId, (countByMember.get(a.memberId) ?? 0) + 1);
    }
    expect(countByMember.size).toBe(3);
    for (const count of countByMember.values()) {
      expect(count).toBeLessThan(tasks.length);
    }
  });

  it("alternates an isRotating task among eligible members in a stable order", () => {
    const tasks = [task("rot", { frequency: "DAILY", isRotating: true })];
    const snap = snapshot({ members: [member("a"), member("b")], tasks });
    const result = planWeek({ snapshot: snap, startDate: now, durationDays: 3, now });

    expect(result.assignments.map((a) => a.memberId)).toEqual(["a", "b", "a"]);
    expect(result.assignments.every((a) => a.reasonCode === "ROTATION")).toBe(true);
  });

  it("excludes tasks whose frequency exceeds the plan duration", () => {
    const tasks = [task("daily", { frequency: "DAILY" }), task("monthly", { frequency: "MONTHLY" })];
    const snap = snapshot({ members: [member("a")], tasks });
    const result = planWeek({ snapshot: snap, startDate: now, durationDays: 7, now });

    expect(result.excludedTasks).toEqual([{ taskName: "monthly", frequency: "MONTHLY" }]);
  });

  it("is deterministic: identical input produces an identical plan", () => {
    const tasks = [task("t1", { frequency: "DAILY" }), task("t2", { frequency: "WEEKLY" })];
    const snap = snapshot({ members: [member("a"), member("b")], tasks });
    const first = planWeek({ snapshot: snap, startDate: now, durationDays: 7, now });
    const second = planWeek({ snapshot: snap, startDate: now, durationDays: 7, now });
    expect(first).toEqual(second);
  });

  it("never mutates the input snapshot", () => {
    const tasks = [task("t1", { frequency: "DAILY" })];
    const snap = snapshot({ members: [member("a"), member("b")], tasks });
    const snapshotCopy = JSON.parse(JSON.stringify(snap));
    planWeek({ snapshot: snap, startDate: now, durationDays: 7, now });
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snapshotCopy);
  });

  it("rotates a WEEKLY task past the most recent real assignee instead of restarting", () => {
    const rotTask = task("rot", { frequency: "WEEKLY", isRotating: true });
    const members = [member("a"), member("b"), member("c")];

    const lastDidA = snapshot({
      members,
      tasks: [rotTask],
      recentAssignments: [
        { taskId: "rot", memberId: "a", dueDate: new Date(now.getTime() - 7 * 86_400_000), status: "COMPLETED", completedAt: now },
      ],
    });
    const afterA = planWeek({ snapshot: lastDidA, startDate: now, durationDays: 7, now });
    expect(afterA.assignments[0]?.memberId).toBe("b");

    const lastDidB = snapshot({
      members,
      tasks: [rotTask],
      recentAssignments: [
        { taskId: "rot", memberId: "b", dueDate: new Date(now.getTime() - 7 * 86_400_000), status: "COMPLETED", completedAt: now },
      ],
    });
    const afterB = planWeek({ snapshot: lastDidB, startDate: now, durationDays: 7, now });
    expect(afterB.assignments[0]?.memberId).toBe("c");

    const lastDidC = snapshot({
      members,
      tasks: [rotTask],
      recentAssignments: [
        { taskId: "rot", memberId: "c", dueDate: new Date(now.getTime() - 7 * 86_400_000), status: "COMPLETED", completedAt: now },
      ],
    });
    const afterC = planWeek({ snapshot: lastDidC, startDate: now, durationDays: 7, now });
    expect(afterC.assignments[0]?.memberId).toBe("a");
  });

  it("continues a DAILY rotating task's alternation from the most recent real assignee", () => {
    const tasks = [task("rot", { frequency: "DAILY", isRotating: true })];
    const snap = snapshot({
      members: [member("a"), member("b")],
      tasks,
      recentAssignments: [
        { taskId: "rot", memberId: "a", dueDate: new Date(now.getTime() - 86_400_000), status: "COMPLETED", completedAt: now },
      ],
    });
    const result = planWeek({ snapshot: snap, startDate: now, durationDays: 3, now });
    expect(result.assignments.map((a) => a.memberId)).toEqual(["b", "a", "b"]);
  });

  it("spreads single-occurrence tasks for one member across different days instead of all landing on day 1", () => {
    const tasks = Array.from({ length: 7 }, (_, i) => task(`t${i}`, { frequency: "WEEKLY" }));
    const snap = snapshot({ members: [member("a")], tasks });
    const result = planWeek({ snapshot: snap, startDate: now, durationDays: 7, now });

    const days = result.assignments.map((a) => a.dayOfWeek);
    expect(new Set(days).size).toBe(7);
  });

  it("never piles more than ceil(n/7)+1 WEEKLY tasks on the same member-day with 2 members", () => {
    const taskCount = 14;
    const tasks = Array.from({ length: taskCount }, (_, i) => task(`t${i}`, { frequency: "WEEKLY" }));
    const snap = snapshot({ members: [member("a"), member("b")], tasks });
    const result = planWeek({ snapshot: snap, startDate: now, durationDays: 7, now });

    const countByMemberDay = new Map<string, number>();
    for (const a of result.assignments) {
      const key = `${a.memberId}:${a.dayOfWeek}`;
      countByMemberDay.set(key, (countByMemberDay.get(key) ?? 0) + 1);
    }
    const bound = Math.ceil(taskCount / 7) + 1;
    for (const count of countByMemberDay.values()) {
      expect(count).toBeLessThanOrEqual(bound);
    }
  });

  it("never assigns a WEEKLY task to a member on a day they are absent", () => {
    const tasks = [task("t1", { frequency: "WEEKLY" })];
    const snap = snapshot({
      members: [
        { id: "a", name: "a", memberType: "ADULT", absences: [{ startDate: now, endDate: now }] },
        member("b"),
      ],
      tasks,
    });
    const result = planWeek({ snapshot: snap, startDate: now, durationDays: 7, now });

    const mondayAssignment = result.assignments.find((a) => a.dayOfWeek === 1);
    expect(mondayAssignment?.memberId).not.toBe("a");
  });
});

describe("pickNextRotationAssignee", () => {
  it("picks the next member in the ring after the current assignee", () => {
    const rotTask = task("rot", { isRotating: true });
    const snap = snapshot({ members: [member("a"), member("b"), member("c")], tasks: [rotTask] });

    expect(pickNextRotationAssignee(rotTask, "a", now, snap)?.memberId).toBe("b");
    expect(pickNextRotationAssignee(rotTask, "b", now, snap)?.memberId).toBe("c");
    expect(pickNextRotationAssignee(rotTask, "c", now, snap)?.memberId).toBe("a");
  });

  it("skips a member absent on the due date", () => {
    const rotTask = task("rot", { isRotating: true });
    const snap = snapshot({
      members: [
        member("a"),
        { id: "b", name: "b", memberType: "ADULT", absences: [{ startDate: now, endDate: now }] },
        member("c"),
      ],
      tasks: [rotTask],
    });

    expect(pickNextRotationAssignee(rotTask, "a", now, snap)?.memberId).toBe("c");
  });

  it("starts from the ring's beginning when the current assignee is no longer eligible", () => {
    const rotTask = task("rot", { isRotating: true });
    const snap = snapshot({ members: [member("a"), member("b")], tasks: [rotTask] });

    expect(pickNextRotationAssignee(rotTask, "ghost", now, snap)?.memberId).toBe("a");
  });

  it("returns null when no member is eligible", () => {
    const rotTask = task("rot", { isRotating: true, minAge: 99 });
    const snap = snapshot({ members: [member("a"), member("b")], tasks: [rotTask] });

    expect(pickNextRotationAssignee(rotTask, "a", now, snap)).toBeNull();
  });
});
