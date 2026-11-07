import { afterEach, describe, expect, it, vi } from "vitest";

const {
  householdFindManyMock,
  expenseFindManyMock,
  assignmentFindManyMock,
  shoppingListItemFindManyMock,
  settlementFindManyMock,
  taskFindManyMock,
  mobileAuthSessionFindManyMock,
  memberFindManyMock,
} = vi.hoisted(() => ({
  householdFindManyMock: vi.fn(),
  expenseFindManyMock: vi.fn(),
  assignmentFindManyMock: vi.fn(),
  shoppingListItemFindManyMock: vi.fn(),
  settlementFindManyMock: vi.fn(),
  taskFindManyMock: vi.fn(),
  mobileAuthSessionFindManyMock: vi.fn(),
  memberFindManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findMany: householdFindManyMock },
    expense: { findMany: expenseFindManyMock },
    assignment: { findMany: assignmentFindManyMock },
    shoppingListItem: { findMany: shoppingListItemFindManyMock },
    settlement: { findMany: settlementFindManyMock },
    task: { findMany: taskFindManyMock },
    mobileAuthSession: { findMany: mobileAuthSessionFindManyMock },
    member: { findMany: memberFindManyMock },
  },
}));

import {
  getActiveHouseholdIds,
  getActiveHouseholdIdsOrEmpty,
  getActiveWindowStart,
} from "../cron/active-households";

function setEmptyActivity() {
  householdFindManyMock.mockResolvedValue([]);
  expenseFindManyMock.mockResolvedValue([]);
  assignmentFindManyMock.mockResolvedValue([]);
  shoppingListItemFindManyMock.mockResolvedValue([]);
  settlementFindManyMock.mockResolvedValue([]);
  taskFindManyMock.mockResolvedValue([]);
  mobileAuthSessionFindManyMock.mockResolvedValue([]);
  memberFindManyMock.mockResolvedValue([]);
}

describe("getActiveWindowStart", () => {
  it("returns 30 days before now by default", () => {
    const now = new Date("2026-11-07T00:00:00.000Z");
    expect(getActiveWindowStart(now)).toEqual(new Date("2026-10-08T00:00:00.000Z"));
  });

  it("accepts a custom window size", () => {
    const now = new Date("2026-11-07T00:00:00.000Z");
    expect(getActiveWindowStart(now, 7)).toEqual(new Date("2026-10-31T00:00:00.000Z"));
  });
});

describe("getActiveHouseholdIds", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty set when nothing is active", async () => {
    setEmptyActivity();

    const result = await getActiveHouseholdIds(new Date("2026-11-07T00:00:00.000Z"));

    expect(result.size).toBe(0);
    expect(memberFindManyMock).not.toHaveBeenCalled();
  });

  it("includes a household created within the window", async () => {
    setEmptyActivity();
    householdFindManyMock.mockResolvedValue([{ id: "hh-new" }]);

    const result = await getActiveHouseholdIds(new Date("2026-11-07T00:00:00.000Z"));

    expect(result.has("hh-new")).toBe(true);
  });

  it("includes a household with a recent expense, completed assignment, shopping list item, settlement, or task", async () => {
    setEmptyActivity();
    expenseFindManyMock.mockResolvedValue([{ householdId: "hh-expense" }]);
    assignmentFindManyMock.mockResolvedValue([{ householdId: "hh-task-done" }]);
    shoppingListItemFindManyMock.mockResolvedValue([{ householdId: "hh-shopping" }]);
    settlementFindManyMock.mockResolvedValue([{ householdId: "hh-settlement" }]);
    taskFindManyMock.mockResolvedValue([{ householdId: "hh-task" }]);

    const result = await getActiveHouseholdIds(new Date("2026-11-07T00:00:00.000Z"));

    expect([...result].sort()).toEqual(
      ["hh-expense", "hh-settlement", "hh-shopping", "hh-task", "hh-task-done"].sort(),
    );
  });

  it("includes a household whose member has a recently used mobile session", async () => {
    setEmptyActivity();
    mobileAuthSessionFindManyMock.mockResolvedValue([{ userId: "user-1" }]);
    memberFindManyMock.mockResolvedValue([{ householdId: "hh-mobile" }]);

    const result = await getActiveHouseholdIds(new Date("2026-11-07T00:00:00.000Z"));

    expect(result.has("hh-mobile")).toBe(true);
    expect(memberFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: ["user-1"] } } }),
    );
  });

  it("excludes an inactive household with no recent activity of any kind", async () => {
    setEmptyActivity();
    householdFindManyMock.mockResolvedValue([]);
    expenseFindManyMock.mockResolvedValue([{ householdId: "hh-active" }]);

    const result = await getActiveHouseholdIds(new Date("2026-11-07T00:00:00.000Z"));

    expect(result.has("hh-inactive")).toBe(false);
  });
});

describe("getActiveHouseholdIdsOrEmpty", () => {
  it("returns an empty set instead of throwing when a query fails", async () => {
    setEmptyActivity();
    expenseFindManyMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const activeHouseholdIds = await getActiveHouseholdIdsOrEmpty(new Date("2026-11-07T12:00:00Z"));

    expect(activeHouseholdIds.size).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
