import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  serviceFindManyMock,
  memberFindManyMock,
  notificationFindFirstMock,
  assignmentFindManyMock,
  householdFindManyMock,
  deliverNotificationMock,
  deliverNotificationToMembersMock,
} = vi.hoisted(() => ({
  serviceFindManyMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  notificationFindFirstMock: vi.fn(),
  assignmentFindManyMock: vi.fn(),
  householdFindManyMock: vi.fn(),
  deliverNotificationMock: vi.fn(),
  deliverNotificationToMembersMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    service: { findMany: serviceFindManyMock },
    member: { findMany: memberFindManyMock },
    notification: { findFirst: notificationFindFirstMock },
    assignment: { findMany: assignmentFindManyMock },
    household: { findMany: householdFindManyMock },
  },
}));

vi.mock("@/lib/push-delivery", () => ({
  deliverNotification: deliverNotificationMock,
  deliverNotificationToMembers: deliverNotificationToMembersMock,
}));

import { processProactiveNotifications } from "../cron/jobs/proactive-notifications";

describe("processProactiveNotifications — TASK_REMINDER", () => {
  beforeEach(() => {
    // Tuesday — skips the Monday-only EXPENSE_WEEKLY_SUMMARY block entirely.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T12:00:00.000Z"));

    serviceFindManyMock.mockResolvedValue([]); // no SERVICE_DUE_SOON candidates
    memberFindManyMock.mockResolvedValue([
      { id: "member-active", householdId: "hh-active", name: "Vos" },
      { id: "member-inactive", householdId: "hh-inactive", name: "Tomi" },
    ]);
    notificationFindFirstMock.mockResolvedValue(null);
    assignmentFindManyMock.mockResolvedValue([{ task: { name: "Lavar los platos" } }]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("skips the member of an inactive household and still reminds an active one", async () => {
    const result = await processProactiveNotifications(new Set(["hh-active"]));

    expect(result.taskReminder).toBe(1);
    expect(deliverNotificationMock).toHaveBeenCalledTimes(1);
    expect(deliverNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: "member-active" }),
    );
  });

  it("sends nothing when no household is active", async () => {
    const result = await processProactiveNotifications(new Set());

    expect(result.taskReminder).toBe(0);
    expect(deliverNotificationMock).not.toHaveBeenCalled();
  });
});
