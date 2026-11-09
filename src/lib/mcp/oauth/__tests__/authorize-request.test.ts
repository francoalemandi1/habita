import { describe, expect, it, vi } from "vitest";

const { getClientMock } = vi.hoisted(() => ({
  getClientMock: vi.fn(),
}));

vi.mock("../clients", () => ({
  getClient: getClientMock,
}));

import { buildRedirectUrl, validateAuthorizeRequest } from "../authorize-request";

import type { McpOAuthClient } from "@prisma/client";

const REDIRECT_URI = "https://claude.ai/api/mcp/callback";
const MCP_RESOURCE = "http://localhost:3000/api/mcp";

const client: McpOAuthClient = {
  id: "client-1",
  clientName: "Claude",
  redirectUris: [REDIRECT_URI],
  createdAt: new Date(),
} as McpOAuthClient;

function baseParams(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    response_type: "code",
    client_id: "client-1",
    redirect_uri: REDIRECT_URI,
    code_challenge: "challenge-value",
    code_challenge_method: "S256",
    state: "state-123",
    ...overrides,
  };
}

describe("validateAuthorizeRequest", () => {
  it("is fatal when client_id is missing", async () => {
    const result = await validateAuthorizeRequest(baseParams({ client_id: undefined }));
    expect(result.kind).toBe("fatal");
  });

  it("is fatal when the client is unknown", async () => {
    getClientMock.mockResolvedValueOnce(null);
    const result = await validateAuthorizeRequest(baseParams());
    expect(result.kind).toBe("fatal");
  });

  it("is fatal when redirect_uri is missing", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const result = await validateAuthorizeRequest(baseParams({ redirect_uri: undefined }));
    expect(result.kind).toBe("fatal");
  });

  it("is fatal when redirect_uri does not match the registered one", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const result = await validateAuthorizeRequest(baseParams({ redirect_uri: "https://evil.example/callback" }));
    expect(result.kind).toBe("fatal");
  });

  it("redirects with unsupported_response_type when response_type is not code", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const result = await validateAuthorizeRequest(baseParams({ response_type: "token" }));
    expect(result.kind).toBe("redirect-error");
    if (result.kind === "redirect-error") {
      const url = new URL(result.redirectUrl);
      expect(url.searchParams.get("error")).toBe("unsupported_response_type");
      expect(url.searchParams.get("state")).toBe("state-123");
    }
  });

  it("redirects with invalid_request when code_challenge is missing", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const result = await validateAuthorizeRequest(baseParams({ code_challenge: undefined }));
    expect(result.kind).toBe("redirect-error");
    if (result.kind === "redirect-error") {
      expect(new URL(result.redirectUrl).searchParams.get("error")).toBe("invalid_request");
    }
  });

  it("redirects with invalid_request when code_challenge_method is not S256", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const result = await validateAuthorizeRequest(baseParams({ code_challenge_method: "plain" }));
    expect(result.kind).toBe("redirect-error");
    if (result.kind === "redirect-error") {
      expect(new URL(result.redirectUrl).searchParams.get("error")).toBe("invalid_request");
    }
  });

  it("redirects with invalid_scope when scope is present and not ahorra", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const result = await validateAuthorizeRequest(baseParams({ scope: "other" }));
    expect(result.kind).toBe("redirect-error");
    if (result.kind === "redirect-error") {
      expect(new URL(result.redirectUrl).searchParams.get("error")).toBe("invalid_scope");
    }
  });

  it("redirects with invalid_target when resource is not the MCP resource URL", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const result = await validateAuthorizeRequest(baseParams({ resource: "https://evil.example/api/mcp" }));
    expect(result.kind).toBe("redirect-error");
    if (result.kind === "redirect-error") {
      expect(new URL(result.redirectUrl).searchParams.get("error")).toBe("invalid_target");
    }
  });

  it("returns ok with defaults when every param is valid", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const result = await validateAuthorizeRequest(baseParams());
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.client).toBe(client);
      expect(result.redirectUri).toBe(REDIRECT_URI);
      expect(result.codeChallenge).toBe("challenge-value");
      expect(result.scope).toBe("ahorra");
      expect(result.resource).toBe(MCP_RESOURCE);
      expect(result.state).toBe("state-123");
    }
  });

  it("accepts a URLSearchParams source", async () => {
    getClientMock.mockResolvedValueOnce(client);
    const params = new URLSearchParams(baseParams() as Record<string, string>);
    const result = await validateAuthorizeRequest(params);
    expect(result.kind).toBe("ok");
  });
});

describe("buildRedirectUrl", () => {
  it("appends params to a redirect URI with no existing query", () => {
    const url = buildRedirectUrl(REDIRECT_URI, { error: "invalid_request", state: "abc" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("error")).toBe("invalid_request");
    expect(parsed.searchParams.get("state")).toBe("abc");
  });

  it("preserves an existing query string", () => {
    const url = buildRedirectUrl(`${REDIRECT_URI}?foo=bar`, { error: "invalid_request" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("foo")).toBe("bar");
    expect(parsed.searchParams.get("error")).toBe("invalid_request");
  });

  it("omits null/undefined values", () => {
    const url = buildRedirectUrl(REDIRECT_URI, { error: "invalid_request", state: null });
    expect(new URL(url).searchParams.has("state")).toBe(false);
  });
});
