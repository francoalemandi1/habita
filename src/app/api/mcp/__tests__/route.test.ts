import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { verifyMcpApiKeyMock, verifyAccessTokenMock, applyRateLimitMock, createAhorraMcpServerMock } = vi.hoisted(() => ({
  verifyMcpApiKeyMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
  createAhorraMcpServerMock: vi.fn(),
}));

vi.mock("@/lib/mcp/api-keys", () => ({ verifyMcpApiKey: verifyMcpApiKeyMock }));
vi.mock("@/lib/mcp/oauth/tokens", () => ({ verifyAccessToken: verifyAccessTokenMock }));
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit: applyRateLimitMock }));
vi.mock("@/lib/mcp/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mcp/server")>("@/lib/mcp/server");
  return { ...actual, createAhorraMcpServer: createAhorraMcpServerMock.mockImplementation(actual.createAhorraMcpServer) };
});

import { POST, GET, DELETE } from "@/app/api/mcp/route";
import { getOAuthIssuer } from "@/lib/mcp/oauth/urls";

const RESOURCE_METADATA_URL = `${getOAuthIssuer()}/.well-known/oauth-protected-resource`;

function buildRequest(options: { authorization?: string; body?: unknown } = {}): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (options.authorization) headers.authorization = options.authorization;

  return new NextRequest("http://localhost:3000/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(options.body ?? {}),
  });
}

describe("POST /api/mcp", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with WWW-Authenticate resource_metadata when the Authorization header is missing", async () => {
    const response = await POST(buildRequest());
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(`Bearer resource_metadata="${RESOURCE_METADATA_URL}"`);
    expect(verifyMcpApiKeyMock).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid or revoked API key", async () => {
    verifyMcpApiKeyMock.mockResolvedValue(null);
    const response = await POST(buildRequest({ authorization: "Bearer hmcp_invalid" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      `Bearer resource_metadata="${RESOURCE_METADATA_URL}", error="invalid_token"`,
    );
  });

  it("returns 401 for an invalid or expired OAuth access token", async () => {
    verifyAccessTokenMock.mockResolvedValue(null);
    const response = await POST(buildRequest({ authorization: "Bearer hmat_invalid" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      `Bearer resource_metadata="${RESOURCE_METADATA_URL}", error="invalid_token"`,
    );
    expect(verifyMcpApiKeyMock).not.toHaveBeenCalled();
  });

  it("reaches the transport for a valid OAuth access token, rate limited per user", async () => {
    verifyAccessTokenMock.mockResolvedValue({ userId: "user-1", clientId: "client-1", scope: "ahorra habita" });
    applyRateLimitMock.mockResolvedValue(null);

    const response = await POST(
      buildRequest({
        authorization: "Bearer hmat_valid",
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(applyRateLimitMock).toHaveBeenCalledWith(expect.anything(), "mcpMeta", "user:user-1");
    expect(verifyMcpApiKeyMock).not.toHaveBeenCalled();
    expect(createAhorraMcpServerMock).toHaveBeenCalledWith({ userId: "user-1", scopes: new Set(["ahorra", "habita"]) });
  });

  it("returns 200 for a valid key + initialize request, then tools/list", async () => {
    verifyMcpApiKeyMock.mockResolvedValue({ id: "key-1", name: "Test consumer" });
    applyRateLimitMock.mockResolvedValue(null);

    const initResponse = await POST(
      buildRequest({
        authorization: "Bearer hmcp_valid",
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        },
      }),
    );

    expect(initResponse.status).toBe(200);
    expect(applyRateLimitMock).toHaveBeenCalledWith(expect.anything(), "mcpMeta", "key-1");
    expect(createAhorraMcpServerMock).toHaveBeenCalledWith(null);

    const toolsResponse = await POST(
      buildRequest({
        authorization: "Bearer hmcp_valid",
        body: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      }),
    );

    expect(toolsResponse.status).toBe(200);
    const json: unknown = await toolsResponse.json();
    expect(json).toMatchObject({ jsonrpc: "2.0", id: 2 });
  });

  it("counts tools/call against the tool-call limit", async () => {
    verifyMcpApiKeyMock.mockResolvedValue({ id: "key-1", name: "Test consumer" });
    applyRateLimitMock.mockResolvedValue(null);

    await POST(
      buildRequest({
        authorization: "Bearer hmcp_valid",
        body: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_product_catalog", arguments: {} } },
      }),
    );

    expect(applyRateLimitMock).toHaveBeenCalledWith(expect.anything(), "mcp", "key-1");
  });

  it("counts a batch containing a tools/call against the tool-call limit", async () => {
    verifyMcpApiKeyMock.mockResolvedValue({ id: "key-1", name: "Test consumer" });
    applyRateLimitMock.mockResolvedValue(null);

    await POST(
      buildRequest({
        authorization: "Bearer hmcp_valid",
        body: [
          { jsonrpc: "2.0", method: "notifications/initialized" },
          { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "get_product_catalog", arguments: {} } },
        ],
      }),
    );

    expect(applyRateLimitMock).toHaveBeenCalledWith(expect.anything(), "mcp", "key-1");
  });

  it("returns the 429 from the limiter without reaching the transport", async () => {
    verifyMcpApiKeyMock.mockResolvedValue({ id: "key-1", name: "Test consumer" });
    applyRateLimitMock.mockResolvedValue(new Response(null, { status: 429 }));

    const response = await POST(
      buildRequest({
        authorization: "Bearer hmcp_valid",
        body: { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "get_product_catalog", arguments: {} } },
      }),
    );

    expect(response.status).toBe(429);
    expect(createAhorraMcpServerMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/mcp", () => {
  it("returns 405 with Allow: POST", () => {
    const response = GET();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});

describe("DELETE /api/mcp", () => {
  it("returns 405 with Allow: POST", () => {
    const response = DELETE();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});
