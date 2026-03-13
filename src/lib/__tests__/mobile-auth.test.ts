import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    mobileAuthSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { cleanupExpiredMobileAuthSessions, rotateMobileRefreshToken } from "@/lib/mobile-auth";

describe("mobile-auth hardening", () => {
  beforeEach(() => {
    process.env.MOBILE_TOKEN_SECRET = "test-mobile-secret-with-32-chars!";
    vi.clearAllMocks();
  });

  it("revokes token family when refresh token reuse is detected", async () => {
    prismaMock.mobileAuthSession.findUnique.mockResolvedValue({
      id: "old-refresh",
      userId: "user-1",
      tokenKind: "REFRESH",
      tokenFamilyId: "family-1",
      deviceId: "device-1",
      expiresAt: new Date(Date.now() + 1000 * 60),
      revokedAt: null,
      rotatedAt: new Date(),
      replacedById: "new-refresh",
    });
    prismaMock.mobileAuthSession.updateMany.mockResolvedValue({ count: 2 });

    const result = await rotateMobileRefreshToken("mob_rt_reused_token", "device-1");

    expect(result).toBeNull();
    expect(prismaMock.mobileAuthSession.updateMany).toHaveBeenCalledWith({
      where: { tokenFamilyId: "family-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("cleans up expired and old revoked mobile sessions", async () => {
    prismaMock.mobileAuthSession.updateMany.mockResolvedValueOnce({ count: 3 });
    prismaMock.mobileAuthSession.deleteMany.mockResolvedValueOnce({ count: 7 });

    const result = await cleanupExpiredMobileAuthSessions();

    expect(result).toEqual({
      revokedExpired: 3,
      deletedOldRevoked: 7,
    });
    expect(prismaMock.mobileAuthSession.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.mobileAuthSession.deleteMany).toHaveBeenCalledTimes(1);
  });
});
