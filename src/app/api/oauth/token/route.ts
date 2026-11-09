import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getClient } from "@/lib/mcp/oauth/clients";
import { consumeAuthorizationCode } from "@/lib/mcp/oauth/codes";
import { issueTokenPair, rotateRefreshToken } from "@/lib/mcp/oauth/tokens";
import { normalizeResource } from "@/lib/mcp/oauth/urls";
import { applyRateLimit } from "@/lib/rate-limit";

import type { NextRequest } from "next/server";

// ============================================
// POST /api/oauth/token — token endpoint (RFC 6749 §4.1.3, §6)
//
// Accepts authorization_code and refresh_token grants for public clients
// (no client secret). Called server-to-server by Claude without cookies —
// CSRF origin checks do not apply here. Rate limited per IP.
// ============================================

export const runtime = "nodejs";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };
const TOKEN_RESPONSE_HEADERS = { ...CORS_HEADERS, "Cache-Control": "no-store" };

function oauthErrorResponse(error: string, description: string, status: number): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: TOKEN_RESPONSE_HEADERS },
  );
}

async function parseBody(request: NextRequest): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === "string") result[key] = value;
    }
    return result;
  }

  const formData = await request.formData();
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

function touchClientLastUsed(clientId: string): void {
  prisma.mcpOAuthClient.update({ where: { id: clientId }, data: { lastUsedAt: new Date() } }).catch((error: unknown) => {
    console.error("[oauth/token] Failed to update client lastUsedAt:", error);
  });
}

function tokenPairResponse(pair: { accessToken: string; refreshToken: string; expiresInSeconds: number; scope: string }): NextResponse {
  return NextResponse.json(
    {
      access_token: pair.accessToken,
      token_type: "Bearer",
      expires_in: pair.expiresInSeconds,
      refresh_token: pair.refreshToken,
      scope: pair.scope,
    },
    { headers: TOKEN_RESPONSE_HEADERS },
  );
}

async function handleAuthorizationCodeGrant(body: Record<string, string>): Promise<NextResponse> {
  const { code, client_id: clientId, redirect_uri: redirectUri, code_verifier: codeVerifier } = body;
  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return oauthErrorResponse(
      "invalid_request",
      "code, client_id, redirect_uri and code_verifier are required",
      400,
    );
  }

  const client = await getClient(clientId);
  if (!client) return oauthErrorResponse("invalid_client", "Unknown client_id", 401);

  const resource = normalizeResource(body.resource ?? null);
  if (!resource) return oauthErrorResponse("invalid_target", "Unsupported resource", 400);

  const consumed = await consumeAuthorizationCode({ code, clientId, redirectUri, codeVerifier, resource });
  if (!consumed) return oauthErrorResponse("invalid_grant", "Invalid, expired or already used authorization code", 400);

  touchClientLastUsed(clientId);

  const pair = await issueTokenPair({
    clientId,
    userId: consumed.userId,
    scope: consumed.scope,
    resource: consumed.resource,
  });

  return tokenPairResponse(pair);
}

async function handleRefreshTokenGrant(body: Record<string, string>): Promise<NextResponse> {
  const { refresh_token: refreshToken, client_id: clientId } = body;
  if (!refreshToken || !clientId) {
    return oauthErrorResponse("invalid_request", "refresh_token and client_id are required", 400);
  }

  const client = await getClient(clientId);
  if (!client) return oauthErrorResponse("invalid_client", "Unknown client_id", 401);

  const pair = await rotateRefreshToken({ refreshToken, clientId });
  if (!pair) return oauthErrorResponse("invalid_grant", "Invalid, expired or already rotated refresh token", 400);

  touchClientLastUsed(clientId);

  return tokenPairResponse(pair);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await applyRateLimit(request, "oauth");
  if (rateLimitResponse) return rateLimitResponse;

  let body: Record<string, string>;
  try {
    body = await parseBody(request);
  } catch {
    return oauthErrorResponse("invalid_request", "Request body could not be parsed", 400);
  }

  const grantType = body.grant_type;
  if (grantType === "authorization_code") return handleAuthorizationCodeGrant(body);
  if (grantType === "refresh_token") return handleRefreshTokenGrant(body);

  return oauthErrorResponse("unsupported_grant_type", "grant_type must be authorization_code or refresh_token", 400);
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
