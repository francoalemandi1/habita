import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  assignmentFindManyMock,
  notificationFindFirstMock,
  householdFindUniqueMock,
  deliverNotificationMock,
} = vi.hoisted(() => ({
  assignmentFindManyMock: vi.fn(),
  notificationFindFirstMock: vi.fn(),
  householdFindUniqueMock: vi.fn(),
  deliverNotificationMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignment: { findMany: assignmentFindManyMock },
    notification: { findFirst: notificationFindFirstMock },
    household: { findUnique: householdFindUniqueMock },
  },
}));

vi.mock("@/lib/push-delivery", () => ({
  deliverNotification: deliverNotificationMock,
}));

import { processOverdueTaskAlerts } from "../cron/jobs/overdue-task-alerts";

describe("processOverdueTaskAlerts", () => {
  beforeEach(() => {
    assignmentFindManyMock.mockResolvedValue([
      {
        id: "assignment-active",
        memberId: "member-active",
        householdId: "hh-active",
        task: { name: "Lavar los platos" },
      },
      {
        id: "assignment-inactive",
        memberId: "member-inactive",
        householdId: "hh-inactive",
        task: { name: "Sacar la basura" },
      },
    ]);
    notificationFindFirstMock.mockResolvedValue(null);
    householdFindUniqueMock.mockResolvedValue({ timezone: "America/Argentina/Buenos_Aires" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips the overdue assignment of an inactive household and still notifies an active one", async () => {
    const sent = await processOverdueTaskAlerts(new Set(["hh-active"]));

    expect(sent).toBe(1);
    expect(deliverNotificationMock).toHaveBeenCalledTimes(1);
    expect(deliverNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: "member-active" }),
    );
  });

  it("sends nothing when no household is active", async () => {
    const sent = await processOverdueTaskAlerts(new Set());

    expect(sent).toBe(0);
    expect(deliverNotificationMock).not.toHaveBeenCalled();
  });
});
