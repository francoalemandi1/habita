import { describe, expect, it } from "vitest";

import { formatCasaDateLabel, summarizeMyBalance, summarizeWeekTasks } from "@habita/domain";

const members = [
  { id: "sofi", name: "Sofi" },
  { id: "me", name: "Franco" },
  { id: "tomi", name: "Tomi" },
];

describe("summarizeWeekTasks", () => {
  it("counts done tasks per member with the current member first", () => {
    const summary = summarizeWeekTasks({
      members,
      currentMemberId: "me",
      assignments: [
        { memberId: "me", status: "COMPLETED" },
        { memberId: "me", status: "PENDING" },
        { memberId: "sofi", status: "VERIFIED" },
        { memberId: "tomi", status: "OVERDUE" },
      ],
    });
    expect(summary).toMatchObject({ done: 2, total: 4, remaining: 2 });
    expect(summary.shares.map((share) => [share.memberId, share.done])).toEqual([
      ["me", 1],
      ["sofi", 1],
      ["tomi", 0],
    ]);
  });

  it("leaves cancelled tasks out of the total", () => {
    const summary = summarizeWeekTasks({
      members,
      currentMemberId: "me",
      assignments: [
        { memberId: "me", status: "CANCELLED" },
        { memberId: "me", status: "PENDING" },
      ],
    });
    expect(summary.total).toBe(1);
  });

  it("reads a difference of one task as even and two as uneven", () => {
    const base = { members, currentMemberId: "me" };
    const even = summarizeWeekTasks({ ...base, assignments: [{ memberId: "me", status: "COMPLETED" }] });
    const uneven = summarizeWeekTasks({
      ...base,
      assignments: [
        { memberId: "me", status: "COMPLETED" },
        { memberId: "me", status: "COMPLETED" },
      ],
    });
    expect(even.isEven).toBe(true);
    expect(uneven.isEven).toBe(false);
  });

  it("handles a household with no tasks", () => {
    const summary = summarizeWeekTasks({ members: [], currentMemberId: "me", assignments: [] });
    expect(summary).toMatchObject({ done: 0, total: 0, remaining: 0, isEven: true });
  });
});

describe("summarizeMyBalance", () => {
  const debt = (from: string, to: string, amount: number) => ({
    fromMemberId: from,
    fromMemberName: from.toUpperCase(),
    toMemberId: to,
    toMemberName: to.toUpperCase(),
    amount,
  });

  it("picks the largest debt in each direction", () => {
    const summary = summarizeMyBalance(
      [debt("sofi", "me", 100), debt("tomi", "me", 300), debt("me", "tomi", 50), debt("sofi", "tomi", 999)],
      "me",
    );
    expect(summary.owedToMe).toEqual({ memberName: "TOMI", amount: 300 });
    expect(summary.iOwe).toEqual({ memberName: "TOMI", amount: 50 });
    expect(summary.isSettled).toBe(false);
  });

  it("is settled when nothing involves the current member", () => {
    expect(summarizeMyBalance([debt("sofi", "tomi", 10)], "me")).toEqual({ owedToMe: null, iOwe: null, isSettled: true });
  });
});

describe("formatCasaDateLabel", () => {
  it("formats weekday, day and short month in uppercase Spanish", () => {
    expect(formatCasaDateLabel(new Date(2026, 10, 3))).toBe("MARTES 3 NOV");
  });
});
