import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getClientMock,
  consumeAuthorizationCodeMock,
  issueTokenPairMock,
  rotateRefreshTokenMock,
  applyRateLimitMock,
  updateMock,
} = vi.hoisted(() => ({
  getClientMock: vi.fn(),
  consumeAuthorizationCodeMock: vi.fn(),
  issueTokenPairMock: vi.fn(),
  rotateRefreshTokenMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/mcp/oauth/clients", () => ({ getClient: getClientMock }));
vi.mock("@/lib/mcp/oauth/codes", () => ({ consumeAuthorizationCode: consumeAuthorizationCodeMock }));
vi.mock("@/lib/mcp/oauth/tokens", () => ({
  issueTokenPair: issueTokenPairMock,
  rotateRefreshToken: rotateRefreshTokenMock,
}));
vi.mock("@/lib/prisma", () => ({ prisma: { mcpOAuthClient: { update: updateMock } } }));
vi.mock("@/lib/rate-limit", () => ({ applyRateLimit: applyRateLimitMock }));

import { POST } from "@/app/api/oauth/token/route";

const CLIENT = { id: "client-1", redirectUris: ["https://claude.ai/callback"] };

function buildFormRequest(fields: Record<string, string>): NextRequest {
  const params = new URLSearchParams(fields);
  return new NextRequest("http://localhost:3000/api/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

function buildJsonRequest(body: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/oauth/token", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the rate limit response when exceeded", async () => {
    const limited = new Response(null, { status: 429 });
    applyRateLimitMock.mockResolvedValue(limited);

    const response = await POST(buildFormRequest({ grant_type: "authorization_code" }));

    expect(response).toBe(limited);
  });

  it("returns 400 unsupported_grant_type for an unknown grant_type", async () => {
    applyRateLimitMock.mockResolvedValue(null);

    const response = await POST(buildFormRequest({ grant_type: "client_credentials" }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("unsupported_grant_type");
  });

  describe("authorization_code grant", () => {
    it("returns 400 invalid_request when required params are missing", async () => {
      applyRateLimitMock.mockResolvedValue(null);

      const response = await POST(buildFormRequest({ grant_type: "authorization_code", client_id: "client-1" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("invalid_request");
      expect(getClientMock).not.toHaveBeenCalled();
    });

    it("returns 401 invalid_client for an unknown client_id", async () => {
      applyRateLimitMock.mockResolvedValue(null);
      getClientMock.mockResolvedValue(null);

      const response = await POST(
        buildFormRequest({
          grant_type: "authorization_code",
          code: "hmcd_x",
          client_id: "unknown",
          redirect_uri: "https://claude.ai/callback",
          code_verifier: "verifier",
        }),
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("invalid_client");
    });

    it("returns 400 invalid_target for a mismatched resource", async () => {
      applyRateLimitMock.mockResolvedValue(null);
      getClientMock.mockResolvedValue(CLIENT);

      const response = await POST(
        buildFormRequest({
          grant_type: "authorization_code",
          code: "hmcd_x",
          client_id: "client-1",
          redirect_uri: "https://claude.ai/callback",
          code_verifier: "verifier",
          resource: "https://evil.example/api/mcp",
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("invalid_target");
      expect(consumeAuthorizationCodeMock).not.toHaveBeenCalled();
    });

    it("returns 400 invalid_grant for an invalid, expired, or reused code (form-urlencoded)", async () => {
      applyRateLimitMock.mockResolvedValue(null);
      getClientMock.mockResolvedValue(CLIENT);
      consumeAuthorizationCodeMock.mockResolvedValue(null);

      const response = await POST(
        buildFormRequest({
          grant_type: "authorization_code",
          code: "hmcd_x",
          client_id: "client-1",
          redirect_uri: "https://claude.ai/callback",
          code_verifier: "verifier",
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("invalid_grant");
    });

    it("issues a token pair on success (JSON body) and returns no-store", async () => {
      applyRateLimitMock.mockResolvedValue(null);
      getClientMock.mockResolvedValue(CLIENT);
      consumeAuthorizationCodeMock.mockResolvedValue({ userId: "user-1", scope: "ahorra", resource: "http://localhost:3000/api/mcp" });
      issueTokenPairMock.mockResolvedValue({
        accessToken: "hmat_abc",
        refreshToken: "hmrt_abc",
        expiresInSeconds: 3600,
        scope: "ahorra",
      });
      updateMock.mockResolvedValue({});

      const response = await POST(
        buildJsonRequest({
          grant_type: "authorization_code",
          code: "hmcd_x",
          client_id: "client-1",
          redirect_uri: "https://claude.ai/callback",
          code_verifier: "verifier",
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const json = await response.json();
      expect(json).toEqual({
        access_token: "hmat_abc",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "hmrt_abc",
        scope: "ahorra",
      });
    });
  });

  describe("refresh_token grant", () => {
    it("returns 400 invalid_request when required params are missing", async () => {
      applyRateLimitMock.mockResolvedValue(null);

      const response = await POST(buildFormRequest({ grant_type: "refresh_token" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("invalid_request");
    });

    it("returns 401 invalid_client for an unknown client_id", async () => {
      applyRateLimitMock.mockResolvedValue(null);
      getClientMock.mockResolvedValue(null);

      const response = await POST(
        buildFormRequest({ grant_type: "refresh_token", refresh_token: "hmrt_x", client_id: "unknown" }),
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("invalid_client");
    });

    it("returns 400 invalid_grant on reuse of an already-rotated refresh token", async () => {
      applyRateLimitMock.mockResolvedValue(null);
      getClientMock.mockResolvedValue(CLIENT);
      rotateRefreshTokenMock.mockResolvedValue(null);

      const response = await POST(
        buildFormRequest({ grant_type: "refresh_token", refresh_token: "hmrt_x", client_id: "client-1" }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("invalid_grant");
    });

    it("rotates and returns a new token pair on success", async () => {
      applyRateLimitMock.mockResolvedValue(null);
      getClientMock.mockResolvedValue(CLIENT);
      rotateRefreshTokenMock.mockResolvedValue({
        accessToken: "hmat_new",
        refreshToken: "hmrt_new",
        expiresInSeconds: 3600,
        scope: "ahorra",
      });
      updateMock.mockResolvedValue({});

      const response = await POST(
        buildFormRequest({ grant_type: "refresh_token", refresh_token: "hmrt_x", client_id: "client-1" }),
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.access_token).toBe("hmat_new");
      expect(json.refresh_token).toBe("hmrt_new");
    });
  });
});
