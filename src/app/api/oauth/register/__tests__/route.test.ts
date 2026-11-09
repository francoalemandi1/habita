import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { registerClientMock, deleteManyMock, applyRateLimitMock } = vi.hoisted(() => ({
  registerClientMock: vi.fn(),
  deleteManyMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/mcp/oauth/clients", () => ({ registerClient: registerClientMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { mcpOAuthClient: { deleteMany: deleteManyMock } } }));
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit: applyRateLimitMock }));

import { POST } from "@/app/api/oauth/register/route";

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/oauth/register", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers a client and returns 201", async () => {
    applyRateLimitMock.mockResolvedValue(null);
    deleteManyMock.mockResolvedValue({ count: 0 });
    registerClientMock.mockResolvedValue({
      ok: true,
      client: {
        id: "client-1",
        clientName: "Claude",
        redirectUris: ["https://claude.ai/callback"],
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    });

    const response = await POST(buildRequest({ client_name: "Claude", redirect_uris: ["https://claude.ai/callback"] }));

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json).toMatchObject({
      client_id: "client-1",
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
  });

  it("returns 400 invalid_redirect_uri for a non-allowed redirect URI", async () => {
    applyRateLimitMock.mockResolvedValue(null);
    deleteManyMock.mockResolvedValue({ count: 0 });
    registerClientMock.mockResolvedValue({
      ok: false,
      error: "invalid_redirect_uri",
      description: "Redirect URI not allowed: http://example.com/callback",
    });

    const response = await POST(buildRequest({ redirect_uris: ["http://example.com/callback"] }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("invalid_redirect_uri");
  });

  it("returns 400 invalid_client_metadata when token_endpoint_auth_method is not none", async () => {
    applyRateLimitMock.mockResolvedValue(null);
    deleteManyMock.mockResolvedValue({ count: 0 });

    const response = await POST(
      buildRequest({ redirect_uris: ["https://claude.ai/callback"], token_endpoint_auth_method: "client_secret_post" }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("invalid_client_metadata");
    expect(registerClientMock).not.toHaveBeenCalled();
  });

  it("returns the rate limit response when exceeded", async () => {
    const limited = new Response(null, { status: 429 });
    applyRateLimitMock.mockResolvedValue(limited);

    const response = await POST(buildRequest({ redirect_uris: ["https://claude.ai/callback"] }));

    expect(response).toBe(limited);
    expect(registerClientMock).not.toHaveBeenCalled();
  });
});
