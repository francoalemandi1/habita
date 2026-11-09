import { afterEach, describe, expect, it, vi } from "vitest";

const { createMock, findUniqueMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { mcpOAuthClient: { create: createMock, findUnique: findUniqueMock } },
}));

import { getClient, registerClient } from "../clients";

describe("registerClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns invalid_redirect_uri when a redirect URI is not allowed", async () => {
    const result = await registerClient({ redirectUris: ["http://example.com/callback"] });

    expect(result).toEqual({
      ok: false,
      error: "invalid_redirect_uri",
      description: expect.stringContaining("http://example.com/callback"),
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns invalid_client_metadata when redirectUris is empty", async () => {
    const result = await registerClient({ redirectUris: [] });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "invalid_client_metadata" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("registers a client with valid redirect URIs", async () => {
    const client = {
      id: "client-1",
      clientName: "Claude Desktop",
      redirectUris: ["https://claude.ai/callback"],
      createdAt: new Date(),
      lastUsedAt: null,
    };
    createMock.mockResolvedValue(client);

    const result = await registerClient({
      clientName: "Claude Desktop",
      redirectUris: ["https://claude.ai/callback"],
    });

    expect(result).toEqual({ ok: true, client });
  });
});

describe("getClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the client when found", async () => {
    const client = { id: "client-1", clientName: null, redirectUris: [], createdAt: new Date(), lastUsedAt: null };
    findUniqueMock.mockResolvedValue(client);

    expect(await getClient("client-1")).toEqual(client);
  });

  it("returns null when not found", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await getClient("unknown")).toBeNull();
  });
});
