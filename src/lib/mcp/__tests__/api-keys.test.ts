import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, updateMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { mcpApiKey: { findUnique: findUniqueMock, update: updateMock } },
}));

import { generateMcpApiKey, getKeyPrefix, hashMcpApiKey, verifyMcpApiKey } from "../api-keys";

describe("generateMcpApiKey", () => {
  it("produces an hmcp_-prefixed key", () => {
    expect(generateMcpApiKey()).toMatch(/^hmcp_[A-Za-z0-9_-]+$/);
  });

  it("produces distinct keys on each call", () => {
    expect(generateMcpApiKey()).not.toBe(generateMcpApiKey());
  });
});

describe("hashMcpApiKey", () => {
  it("is deterministic sha256 hex", () => {
    const key = "hmcp_abc123";
    expect(hashMcpApiKey(key)).toBe(createHash("sha256").update(key).digest("hex"));
  });
});

describe("getKeyPrefix", () => {
  it("returns the first 12 characters", () => {
    expect(getKeyPrefix("hmcp_0123456789abcdef")).toBe("hmcp_0123456");
  });
});

describe("verifyMcpApiKey", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for a key with the wrong prefix, without hitting the DB", async () => {
    expect(await verifyMcpApiKey("wrong_prefix_key")).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns null for an overly long key, without hitting the DB", async () => {
    const longKey = `hmcp_${"a".repeat(100)}`;
    expect(await verifyMcpApiKey(longKey)).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns null for an unknown key", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await verifyMcpApiKey("hmcp_unknown")).toBeNull();
  });

  it("returns null for a revoked key", async () => {
    findUniqueMock.mockResolvedValue({
      id: "key-1",
      name: "Test",
      revokedAt: new Date(),
      lastUsedAt: null,
    });
    expect(await verifyMcpApiKey("hmcp_revoked")).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns { id, name } for a valid, active key and updates lastUsedAt when stale", async () => {
    findUniqueMock.mockResolvedValue({
      id: "key-1",
      name: "Test consumer",
      revokedAt: null,
      lastUsedAt: null,
    });
    updateMock.mockResolvedValue({});

    const result = await verifyMcpApiKey("hmcp_valid");

    expect(result).toEqual({ id: "key-1", name: "Test consumer" });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("does not update lastUsedAt when it was touched less than 10 minutes ago", async () => {
    findUniqueMock.mockResolvedValue({
      id: "key-1",
      name: "Test consumer",
      revokedAt: null,
      lastUsedAt: new Date(Date.now() - 60_000),
    });

    await verifyMcpApiKey("hmcp_valid");

    expect(updateMock).not.toHaveBeenCalled();
  });
});
