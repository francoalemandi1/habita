import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

const { createMock, updateManyMock, findUniqueMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mcpOAuthCode: { create: createMock, updateMany: updateManyMock, findUnique: findUniqueMock },
  },
}));

import { consumeAuthorizationCode, createAuthorizationCode } from "../codes";

const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

function baseRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "code-1",
    codeHash: "irrelevant",
    clientId: "client-1",
    userId: "user-1",
    redirectUri: "https://claude.ai/callback",
    codeChallenge: CHALLENGE,
    scope: "ahorra",
    resource: "https://habita.casa/api/mcp",
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    code: "hmcd_raw",
    clientId: "client-1",
    redirectUri: "https://claude.ai/callback",
    codeVerifier: VERIFIER,
    resource: "https://habita.casa/api/mcp",
    ...overrides,
  };
}

describe("createAuthorizationCode", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stores only the sha256 hash and returns the raw code", async () => {
    createMock.mockResolvedValue({});

    const raw = await createAuthorizationCode({
      clientId: "client-1",
      userId: "user-1",
      redirectUri: "https://claude.ai/callback",
      codeChallenge: CHALLENGE,
      scope: "ahorra",
      resource: "https://habita.casa/api/mcp",
    });

    expect(raw).toMatch(/^hmcd_/);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ codeHash: createHash("sha256").update(raw).digest("hex") }),
    });
  });
});

describe("consumeAuthorizationCode", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the code was already consumed (reuse)", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    expect(await consumeAuthorizationCode(baseInput())).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns null for a wrong code verifier", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findUniqueMock.mockResolvedValue(baseRecord());

    expect(await consumeAuthorizationCode(baseInput({ codeVerifier: "a".repeat(43) }))).toBeNull();
  });

  it("returns null for a mismatched redirect URI", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findUniqueMock.mockResolvedValue(baseRecord());

    expect(await consumeAuthorizationCode(baseInput({ redirectUri: "https://other.example/callback" }))).toBeNull();
  });

  it("returns null for an expired code", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findUniqueMock.mockResolvedValue(baseRecord({ expiresAt: new Date(Date.now() - 1000) }));

    expect(await consumeAuthorizationCode(baseInput())).toBeNull();
  });

  it("returns null for a resource mismatch", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findUniqueMock.mockResolvedValue(baseRecord());

    expect(await consumeAuthorizationCode(baseInput({ resource: "https://other.example/api/mcp" }))).toBeNull();
  });

  it("returns null for a wrong client", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findUniqueMock.mockResolvedValue(baseRecord());

    expect(await consumeAuthorizationCode(baseInput({ clientId: "client-2" }))).toBeNull();
  });

  it("returns the code's payload on the happy path", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findUniqueMock.mockResolvedValue(baseRecord());

    const result = await consumeAuthorizationCode(baseInput());

    expect(result).toEqual({
      userId: "user-1",
      scope: "ahorra",
      resource: "https://habita.casa/api/mcp",
    });
  });
});
