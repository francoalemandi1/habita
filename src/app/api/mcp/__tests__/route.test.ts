import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { verifyMcpApiKeyMock, applyRateLimitMock } = vi.hoisted(() => ({
  verifyMcpApiKeyMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/mcp/api-keys", () => ({ verifyMcpApiKey: verifyMcpApiKeyMock }));
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit: applyRateLimitMock }));

import { POST, GET, DELETE } from "@/app/api/mcp/route";

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

  it("returns 401 with WWW-Authenticate when the Authorization header is missing", async () => {
    const response = await POST(buildRequest());
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(verifyMcpApiKeyMock).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid or revoked API key", async () => {
    verifyMcpApiKeyMock.mockResolvedValue(null);
    const response = await POST(buildRequest({ authorization: "Bearer hmcp_invalid" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
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
    expect(applyRateLimitMock).toHaveBeenCalledWith(expect.anything(), "mcp", "key-1");

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
