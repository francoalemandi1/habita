import { describe, expect, it, vi } from "vitest";

const { verifyGoogleIdTokenMock } = vi.hoisted(() => ({
  verifyGoogleIdTokenMock: vi.fn(),
}));

vi.mock("@/lib/google-id-token", () => ({
  verifyGoogleIdToken: verifyGoogleIdTokenMock,
}));

import { POST } from "@/app/api/auth/mobile/exchange/route";

describe("POST /api/auth/mobile/exchange", () => {
  it("returns 401 when google id token is invalid", async () => {
    verifyGoogleIdTokenMock.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/auth/mobile/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "bad-token" }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(401);
  });
});
