import { describe, expect, it, vi } from "vitest";

const { authMock, getClientMock, createAuthorizationCodeMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getClientMock: vi.fn(),
  createAuthorizationCodeMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/mcp/oauth/clients", () => ({
  getClient: getClientMock,
}));

vi.mock("@/lib/mcp/oauth/codes", () => ({
  createAuthorizationCode: createAuthorizationCodeMock,
}));

import { POST } from "@/app/api/oauth/authorize/route";

import type { McpOAuthClient } from "@prisma/client";

const REDIRECT_URI = "https://claude.ai/api/mcp/callback";

const client: McpOAuthClient = {
  id: "client-1",
  clientName: "Claude",
  redirectUris: [REDIRECT_URI],
  createdAt: new Date(),
} as McpOAuthClient;

function baseBody(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    decision: "approve",
    response_type: "code",
    client_id: "client-1",
    redirect_uri: REDIRECT_URI,
    code_challenge: "challenge-value",
    code_challenge_method: "S256",
    state: "state-123",
    ...overrides,
  };
}

function makeRequest(body: Record<string, string | undefined>): Request {
  return new Request("http://localhost/api/oauth/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/oauth/authorize", () => {
  it("returns 401 when there is no session", async () => {
    authMock.mockResolvedValueOnce(null);

    const response = await POST(makeRequest(baseBody()) as never);
    expect(response.status).toBe(401);
  });

  it("returns 400 for an unmatched redirect_uri", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1", email: "a@b.com" } });
    getClientMock.mockResolvedValueOnce(client);

    const response = await POST(
      makeRequest(baseBody({ redirect_uri: "https://evil.example/callback" })) as never,
    );
    expect(response.status).toBe(400);
  });

  it("returns a redirect-error URL for PKCE method plain", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1", email: "a@b.com" } });
    getClientMock.mockResolvedValueOnce(client);

    const response = await POST(makeRequest(baseBody({ code_challenge_method: "plain" })) as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(new URL(json.redirectUrl).searchParams.get("error")).toBe("invalid_request");
  });

  it("returns a code and state when approved", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1", email: "a@b.com" } });
    getClientMock.mockResolvedValueOnce(client);
    createAuthorizationCodeMock.mockResolvedValueOnce("hmcd_raw-code");

    const response = await POST(makeRequest(baseBody()) as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    const url = new URL(json.redirectUrl);
    expect(url.searchParams.get("code")).toBe("hmcd_raw-code");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("iss")).toBeTruthy();
  });

  it("returns access_denied when denied", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1", email: "a@b.com" } });
    getClientMock.mockResolvedValueOnce(client);

    const response = await POST(makeRequest(baseBody({ decision: "deny" })) as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    const url = new URL(json.redirectUrl);
    expect(url.searchParams.get("error")).toBe("access_denied");
    expect(url.searchParams.get("state")).toBe("state-123");
  });
});
