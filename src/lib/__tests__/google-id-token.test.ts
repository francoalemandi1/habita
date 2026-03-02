import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyGoogleIdToken } from "@/lib/google-id-token";

describe("verifyGoogleIdToken", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
  });

  it("rejects token when issuer is invalid", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        iss: "https://malicious.example",
        aud: "google-client-id",
        sub: "sub-1",
        email: "user@example.com",
        email_verified: "true",
        exp: String(Math.floor(Date.now() / 1000) + 120),
      }),
    } as Response);

    const result = await verifyGoogleIdToken("id-token");
    expect(result).toBeNull();

    globalThis.fetch = originalFetch;
  });

  it("accepts token when issuer and audience are valid", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        iss: "https://accounts.google.com",
        aud: "google-client-id",
        sub: "sub-1",
        email: "USER@Example.com",
        email_verified: "true",
        name: "User Name",
        picture: "https://example.com/avatar.png",
        exp: String(Math.floor(Date.now() / 1000) + 120),
      }),
    } as Response);

    const result = await verifyGoogleIdToken("id-token");
    expect(result).toEqual({
      providerAccountId: "sub-1",
      email: "user@example.com",
      name: "User Name",
      image: "https://example.com/avatar.png",
    });

    globalThis.fetch = originalFetch;
  });
});
