import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  householdFindManyMock,
  notificationFindFirstMock,
  assignmentCountMock,
  serviceCountMock,
  bankPromoFindFirstMock,
  memberFindManyMock,
  deliverNotificationToMembersMock,
  getHouseholdBalancesMock,
} = vi.hoisted(() => ({
  householdFindManyMock: vi.fn(),
  notificationFindFirstMock: vi.fn(),
  assignmentCountMock: vi.fn(),
  serviceCountMock: vi.fn(),
  bankPromoFindFirstMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  deliverNotificationToMembersMock: vi.fn(),
  getHouseholdBalancesMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findMany: householdFindManyMock },
    notification: { findFirst: notificationFindFirstMock },
    assignment: { count: assignmentCountMock },
    service: { count: serviceCountMock },
    bankPromo: { findFirst: bankPromoFindFirstMock },
    member: { findMany: memberFindManyMock },
  },
}));

vi.mock("@/lib/push-delivery", () => ({
  deliverNotificationToMembers: deliverNotificationToMembersMock,
}));

vi.mock("@/lib/expense-balances", () => ({
  getHouseholdBalances: getHouseholdBalancesMock,
}));

import { processMorningBriefing } from "../cron/jobs/morning-briefing";

const TIMEZONE = "America/Argentina/Buenos_Aires";
const ALL_HOUSEHOLDS = [
  { id: "hh-active", timezone: TIMEZONE },
  { id: "hh-inactive", timezone: TIMEZONE },
];

describe("processMorningBriefing", () => {
  beforeEach(() => {
    // 07:30 in UTC-3 (Buenos Aires) — inside the 7-8am send window.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T10:30:00.000Z"));

    householdFindManyMock.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      ALL_HOUSEHOLDS.filter((h) => where.id.in.includes(h.id)),
    );
    notificationFindFirstMock.mockResolvedValue(null);
    assignmentCountMock.mockResolvedValue(2);
    serviceCountMock.mockResolvedValue(0);
    bankPromoFindFirstMock.mockResolvedValue(null);
    getHouseholdBalancesMock.mockResolvedValue({
      primaryCurrency: "ARS",
      byCurrency: { ARS: { balances: [] } },
    });
    memberFindManyMock.mockResolvedValue([{ id: "member-1" }]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("never queries or notifies a household outside the active set", async () => {
    await processMorningBriefing(new Set(["hh-active"]));

    expect(householdFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["hh-active"] } }) }),
    );
    expect(deliverNotificationToMembersMock).toHaveBeenCalledTimes(1);
    expect(deliverNotificationToMembersMock).toHaveBeenCalledWith(
      expect.objectContaining({ memberIds: ["member-1"] }),
    );
  });

  it("sends nothing when no household is active", async () => {
    const sent = await processMorningBriefing(new Set());

    expect(sent).toBe(0);
    expect(deliverNotificationToMembersMock).not.toHaveBeenCalled();
  });
});
