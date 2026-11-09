import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { verifyMcpApiKey } from "@/lib/mcp/api-keys";
import { verifyAccessToken } from "@/lib/mcp/oauth/tokens";
import { getMcpResourceUrl, getOAuthIssuer } from "@/lib/mcp/oauth/urls";
import { ACCESS_TOKEN_PREFIX } from "@/lib/mcp/oauth/constants";
import { createAhorraMcpServer } from "@/lib/mcp/server";
import { applyRateLimit } from "@/lib/rate-limit";

import type { NextRequest } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

// ============================================
// POST /api/mcp — Ahorrá MCP (Streamable HTTP, stateless)
//
// Auth: either an OAuth 2.1 access token (`hmat_…`, issued by /api/oauth/token,
// rate limited per user) or a per-consumer API key (McpApiKey table, rate
// limited per key), both via `Authorization: Bearer <token>`. A missing or
// invalid token returns 401 with `WWW-Authenticate: Bearer resource_metadata="…"`
// pointing Claude at the protected resource metadata (RFC 9728).
// Rate limit: 60 JSON-RPC requests / 10 min per key (see rate-limit.ts "mcp" kind).
// Every request counts, including initialize and tools/list (~3 per client connection).
//
// Recurring cost (checked 2026-11-07, see MCP_PLAN.md):
// worst case one key at the rate limit = 8,640 requests/day.
// | Actor              | Unit                | 5 keys x 50 calls/day (7.5k/mo) |
// |--------------------|---------------------|----------------------------------|
// | Vercel functions    | invocation          | < 1% of 1M (Hobby)               |
// | Upstash Redis       | command (~5/call)   | ~8% of 500k free                 |
// | Neon (key lookup)   | query               | negligible                       |
// | VTEX/Coto/Coope     | outbound fetch      | bounded by limiter(8) + cache     |
// | promoarg            | fetch               | negligible                       |
// Re-evaluate if any key sustains > 500/day or Upstash > 20%.
// ============================================

const JSON_RPC_VERSION = "2.0";

function wwwAuthenticateHeader(error?: "invalid_token"): string {
  const resourceMetadataUrl = `${getOAuthIssuer()}/.well-known/oauth-protected-resource`;
  const errorParam = error ? `, error="${error}"` : "";
  return `Bearer resource_metadata="${resourceMetadataUrl}"${errorParam}`;
}

function unauthorizedResponse(message: string, error?: "invalid_token"): NextResponse {
  return NextResponse.json(
    { jsonrpc: JSON_RPC_VERSION, error: { code: -32001, message }, id: null },
    { status: 401, headers: { "WWW-Authenticate": wwwAuthenticateHeader(error) } },
  );
}

function methodNotAllowedResponse(): NextResponse {
  return NextResponse.json(
    { jsonrpc: JSON_RPC_VERSION, error: { code: -32601, message: "Method not allowed" }, id: null },
    { status: 405, headers: { Allow: "POST" } },
  );
}

async function rateLimitKeyForAccessToken(token: string): Promise<string | null> {
  const verified = await verifyAccessToken(token, getMcpResourceUrl());
  return verified ? `user:${verified.userId}` : null;
}

async function rateLimitKeyForApiKey(token: string): Promise<string | null> {
  const apiKey = await verifyMcpApiKey(token);
  return apiKey ? apiKey.id : null;
}

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!bearerToken) return unauthorizedResponse("Missing Authorization: Bearer <token> header");

  const rateLimitKeySuffix = bearerToken.startsWith(ACCESS_TOKEN_PREFIX)
    ? await rateLimitKeyForAccessToken(bearerToken)
    : await rateLimitKeyForApiKey(bearerToken);

  if (!rateLimitKeySuffix) return unauthorizedResponse("Invalid or expired token", "invalid_token");

  const rateLimitResponse = await applyRateLimit(request, "mcp", rateLimitKeySuffix);
  if (rateLimitResponse) return rateLimitResponse;

  const server = createAhorraMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}

export function GET(): NextResponse {
  return methodNotAllowedResponse();
}

export function DELETE(): NextResponse {
  return methodNotAllowedResponse();
}
