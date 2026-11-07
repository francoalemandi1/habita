import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  householdFindManyMock,
  notificationFindFirstMock,
  culturalEventFindFirstMock,
  memberFindManyMock,
  deliverNotificationToMembersMock,
} = vi.hoisted(() => ({
  householdFindManyMock: vi.fn(),
  notificationFindFirstMock: vi.fn(),
  culturalEventFindFirstMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  deliverNotificationToMembersMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findMany: householdFindManyMock },
    notification: { findFirst: notificationFindFirstMock },
    culturalEvent: { findFirst: culturalEventFindFirstMock },
    member: { findMany: memberFindManyMock },
  },
}));

vi.mock("@/lib/push-delivery", () => ({
  deliverNotificationToMembers: deliverNotificationToMembersMock,
}));

import { processCulturalRecommendations } from "../cron/jobs/cultural-recommendations";

const ALL_HOUSEHOLDS = [
  { id: "hh-active", city: "Córdoba", timezone: "America/Argentina/Cordoba" },
  { id: "hh-inactive", city: "Córdoba", timezone: "America/Argentina/Cordoba" },
];

describe("processCulturalRecommendations", () => {
  beforeEach(() => {
    householdFindManyMock.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      ALL_HOUSEHOLDS.filter((h) => where.id.in.includes(h.id)),
    );
    notificationFindFirstMock.mockResolvedValue(null);
    culturalEventFindFirstMock.mockResolvedValue({
      title: "Feria de Diseño",
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      venueName: "Paseo del Buen Pastor",
    });
    memberFindManyMock.mockResolvedValue([{ id: "member-1" }]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips an inactive household and still notifies an active one", async () => {
    const sent = await processCulturalRecommendations(new Set(["hh-active"]));

    expect(householdFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["hh-active"] } }) }),
    );
    expect(sent).toBe(1);
    expect(deliverNotificationToMembersMock).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when no household is active", async () => {
    const sent = await processCulturalRecommendations(new Set());

    expect(sent).toBe(0);
    expect(deliverNotificationToMembersMock).not.toHaveBeenCalled();
  });
});
