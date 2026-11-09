import { afterEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, createMock, updateMock, updateManyMock, transactionMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  updateManyMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mcpOAuthToken: {
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock,
      updateMany: updateManyMock,
    },
    $transaction: transactionMock,
  },
}));

import { revokeToken, rotateRefreshToken, verifyAccessToken } from "../tokens";

const RESOURCE = "https://habita.casa/api/mcp";

function baseToken(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "token-1",
    tokenHash: "irrelevant",
    kind: "ACCESS",
    clientId: "client-1",
    userId: "user-1",
    familyId: "family-1",
    scope: "ahorra",
    resource: RESOURCE,
    expiresAt: new Date(Date.now() + 60_000),
    issuedAt: new Date(Date.now() - 1000),
    lastUsedAt: null,
    rotatedAt: null,
    revokedAt: null,
    user: { sessionInvalidatedAt: null },
    ...overrides,
  };
}

describe("verifyAccessToken", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null without hitting the DB for the wrong prefix", async () => {
    expect(await verifyAccessToken("hmrt_wrong_kind", RESOURCE)).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns the payload for a valid access token", async () => {
    findUniqueMock.mockResolvedValue(baseToken());
    updateMock.mockResolvedValue({});

    const result = await verifyAccessToken("hmat_valid", RESOURCE);

    expect(result).toEqual({ userId: "user-1", clientId: "client-1", scope: "ahorra" });
  });

  it("returns null for a resource mismatch", async () => {
    findUniqueMock.mockResolvedValue(baseToken({ resource: "https://other.example/api/mcp" }));
    expect(await verifyAccessToken("hmat_valid", RESOURCE)).toBeNull();
  });

  it("returns null for an expired token", async () => {
    findUniqueMock.mockResolvedValue(baseToken({ expiresAt: new Date(Date.now() - 1000) }));
    expect(await verifyAccessToken("hmat_valid", RESOURCE)).toBeNull();
  });

  it("returns null for a revoked token", async () => {
    findUniqueMock.mockResolvedValue(baseToken({ revokedAt: new Date() }));
    expect(await verifyAccessToken("hmat_valid", RESOURCE)).toBeNull();
  });

  it("returns null when the user's sessions were invalidated after issuance", async () => {
    findUniqueMock.mockResolvedValue(
      baseToken({ issuedAt: new Date(Date.now() - 2000), user: { sessionInvalidatedAt: new Date() } }),
    );
    expect(await verifyAccessToken("hmat_valid", RESOURCE)).toBeNull();
  });
});

describe("rotateRefreshToken", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for the wrong client", async () => {
    findUniqueMock.mockResolvedValue(baseToken({ kind: "REFRESH", clientId: "client-1" }));
    expect(await rotateRefreshToken({ refreshToken: "hmrt_token", clientId: "client-2" })).toBeNull();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("revokes the family and returns null on reuse of an already-rotated token", async () => {
    findUniqueMock.mockResolvedValue(baseToken({ kind: "REFRESH", rotatedAt: new Date() }));
    updateManyMock.mockResolvedValue({ count: 2 });

    const result = await rotateRefreshToken({ refreshToken: "hmrt_token", clientId: "client-1" });

    expect(result).toBeNull();
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { familyId: "family-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("revokes the family and returns null for an already-revoked token", async () => {
    findUniqueMock.mockResolvedValue(baseToken({ kind: "REFRESH", revokedAt: new Date() }));
    updateManyMock.mockResolvedValue({ count: 2 });

    expect(await rotateRefreshToken({ refreshToken: "hmrt_token", clientId: "client-1" })).toBeNull();
  });

  it("returns null without issuing tokens when a concurrent rotation already claimed the token", async () => {
    findUniqueMock.mockResolvedValue(baseToken({ kind: "REFRESH" }));
    updateManyMock.mockResolvedValue({ count: 0 });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        mcpOAuthToken: { updateMany: updateManyMock, update: updateMock, create: createMock },
      }),
    );

    expect(await rotateRefreshToken({ refreshToken: "hmrt_token", clientId: "client-1" })).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rotates and returns a fresh pair on the happy path", async () => {
    findUniqueMock.mockResolvedValue(baseToken({ kind: "REFRESH" }));
    updateManyMock.mockResolvedValue({ count: 1 });
    createMock
      .mockResolvedValueOnce({ id: "access-2" })
      .mockResolvedValueOnce({ id: "refresh-2" });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        mcpOAuthToken: { updateMany: updateManyMock, update: updateMock, create: createMock },
      }),
    );

    const result = await rotateRefreshToken({ refreshToken: "hmrt_token", clientId: "client-1" });

    expect(result).toMatchObject({ expiresInSeconds: 3600, scope: "ahorra" });
    expect(result?.accessToken).toMatch(/^hmat_/);
    expect(result?.refreshToken).toMatch(/^hmrt_/);
  });
});

describe("revokeToken", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("revokes the token's family when it belongs to the given client", async () => {
    findUniqueMock.mockResolvedValue(baseToken());
    updateManyMock.mockResolvedValue({ count: 1 });

    await revokeToken({ token: "hmat_token", clientId: "client-1" });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { familyId: "family-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("does nothing when the token belongs to a different client", async () => {
    findUniqueMock.mockResolvedValue(baseToken());

    await revokeToken({ token: "hmat_token", clientId: "client-2" });

    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("does nothing for an unknown token", async () => {
    findUniqueMock.mockResolvedValue(null);

    await revokeToken({ token: "hmat_unknown", clientId: "client-1" });

    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
