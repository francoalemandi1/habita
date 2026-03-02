import { describe, expect, it, vi } from "vitest";

const { rotateMobileRefreshTokenMock } = vi.hoisted(() => ({
  rotateMobileRefreshTokenMock: vi.fn(),
}));

vi.mock("@/lib/mobile-auth", () => ({
  rotateMobileRefreshToken: rotateMobileRefreshTokenMock,
}));

import { POST } from "@/app/api/auth/mobile/refresh/route";

describe("POST /api/auth/mobile/refresh", () => {
  it("returns 401 when refresh token is invalid", async () => {
    rotateMobileRefreshTokenMock.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/auth/mobile/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "mob_rt_invalid", deviceId: "device-1" }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(401);
  });

  it("returns token payload on successful rotation", async () => {
    rotateMobileRefreshTokenMock.mockResolvedValueOnce({
      accessToken: "mob_at_new",
      refreshToken: "mob_rt_new",
      expiresInSeconds: 900,
    });

    const request = new Request("http://localhost/api/auth/mobile/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "mob_rt_valid", deviceId: "device-1" }),
    });

    const response = await POST(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      accessToken: "mob_at_new",
      refreshToken: "mob_rt_new",
      expiresInSeconds: 900,
    });
  });
});
