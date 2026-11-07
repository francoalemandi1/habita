import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  householdFindManyMock,
  notificationFindFirstMock,
  expenseAggregateMock,
  expenseGroupByMock,
  memberFindManyMock,
  deliverNotificationToMembersMock,
} = vi.hoisted(() => ({
  householdFindManyMock: vi.fn(),
  notificationFindFirstMock: vi.fn(),
  expenseAggregateMock: vi.fn(),
  expenseGroupByMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  deliverNotificationToMembersMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findMany: householdFindManyMock },
    notification: { findFirst: notificationFindFirstMock },
    expense: { aggregate: expenseAggregateMock, groupBy: expenseGroupByMock },
    member: { findMany: memberFindManyMock },
  },
}));

vi.mock("@/lib/push-delivery", () => ({
  deliverNotificationToMembers: deliverNotificationToMembersMock,
}));

import { processSpendingAnomalyAlerts } from "../cron/jobs/spending-anomaly-alerts";

function amount(value: number) {
  return { toNumber: () => value };
}

const ALL_HOUSEHOLDS = [
  { id: "hh-active", timezone: "America/Argentina/Buenos_Aires" },
  { id: "hh-inactive", timezone: "America/Argentina/Buenos_Aires" },
];

describe("processSpendingAnomalyAlerts", () => {
  beforeEach(() => {
    householdFindManyMock.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      ALL_HOUSEHOLDS.filter((h) => where.id.in.includes(h.id)),
    );
    notificationFindFirstMock.mockResolvedValue(null);
    expenseAggregateMock
      .mockResolvedValueOnce({ _sum: { amount: amount(200_000) } }) // this month
      .mockResolvedValueOnce({ _sum: { amount: amount(100_000) } }) // 1 month ago
      .mockResolvedValueOnce({ _sum: { amount: amount(100_000) } }) // 2 months ago
      .mockResolvedValueOnce({ _sum: { amount: amount(100_000) } }); // 3 months ago
    expenseGroupByMock.mockResolvedValue([{ category: "FOOD", _sum: { amount: amount(150_000) } }]);
    memberFindManyMock.mockResolvedValue([{ id: "member-1" }]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips an inactive household and still notifies an active one over the threshold", async () => {
    const sent = await processSpendingAnomalyAlerts(new Set(["hh-active"]));

    expect(householdFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["hh-active"] } }) }),
    );
    expect(sent).toBe(1);
    expect(deliverNotificationToMembersMock).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when no household is active", async () => {
    const sent = await processSpendingAnomalyAlerts(new Set());

    expect(sent).toBe(0);
    expect(deliverNotificationToMembersMock).not.toHaveBeenCalled();
  });
});
