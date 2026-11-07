import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  householdFindManyMock,
  notificationCountMock,
  memberFindManyMock,
  bankPromoFindFirstMock,
  deliverNotificationToMembersMock,
} = vi.hoisted(() => ({
  householdFindManyMock: vi.fn(),
  notificationCountMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  bankPromoFindFirstMock: vi.fn(),
  deliverNotificationToMembersMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findMany: householdFindManyMock },
    notification: { count: notificationCountMock },
    member: { findMany: memberFindManyMock },
    bankPromo: { findFirst: bankPromoFindFirstMock },
  },
}));

vi.mock("@/lib/push-delivery", () => ({
  deliverNotificationToMembers: deliverNotificationToMembersMock,
}));

import { processDealAlerts } from "../cron/jobs/deal-alerts";

const ALL_HOUSEHOLDS = [
  { id: "hh-active", timezone: "America/Argentina/Buenos_Aires" },
  { id: "hh-inactive", timezone: "America/Argentina/Buenos_Aires" },
];

describe("processDealAlerts", () => {
  beforeEach(() => {
    householdFindManyMock.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      ALL_HOUSEHOLDS.filter((h) => where.id.in.includes(h.id)),
    );
    notificationCountMock.mockResolvedValue(0);
    memberFindManyMock.mockResolvedValue([{ id: "member-1" }]);
    bankPromoFindFirstMock.mockResolvedValue({
      storeName: "Carrefour",
      discountPercent: 60,
      bankDisplayName: "Banco Nación",
      title: "60% con Banco Nación",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips an inactive household and still notifies an active one", async () => {
    const sent = await processDealAlerts(new Set(["hh-active"]));

    expect(householdFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["hh-active"] } }) }),
    );
    expect(sent).toBe(1);
    expect(deliverNotificationToMembersMock).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when no household is active", async () => {
    const sent = await processDealAlerts(new Set());

    expect(sent).toBe(0);
    expect(deliverNotificationToMembersMock).not.toHaveBeenCalled();
  });
});
