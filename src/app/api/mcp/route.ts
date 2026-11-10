import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { verifyMcpApiKey } from "@/lib/mcp/api-keys";
import { verifyAccessToken } from "@/lib/mcp/oauth/tokens";
import { getMcpResourceUrl, getOAuthIssuer } from "@/lib/mcp/oauth/urls";
import { ACCESS_TOKEN_PREFIX } from "@/lib/mcp/oauth/constants";
import { buildMcpIdentity } from "@/lib/mcp/identity";
import { createAhorraMcpServer } from "@/lib/mcp/server";
import { applyRateLimit } from "@/lib/rate-limit";

import type { McpIdentity } from "@/lib/mcp/identity";

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
// Rate limit, per user or key (see rate-limit.ts): 60 tools/call per 10 min ("mcp"),
// plus 120 other requests per 10 min ("mcpMeta": initialize, tools/list,
// notifications). Connection overhead used to share the tool-call budget, and a
// 40-item cart priced item by item hit 429 halfway.
//
// Recurring cost (checked 2026-11-07, re-checked 2026-11-10 for the split):
// worst case one key at both limits = 25,920 requests/day (8,640 of them tool
// calls, unchanged). Meta requests don't fetch stores; they cost one Vercel
// invocation, one token lookup and ~5 Upstash commands each.
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

interface ResolvedAuth {
  rateLimitKeySuffix: string;
  identity: McpIdentity | null;
}

async function resolveAuthForAccessToken(token: string): Promise<ResolvedAuth | null> {
  const verified = await verifyAccessToken(token, getMcpResourceUrl());
  if (!verified) return null;
  return {
    rateLimitKeySuffix: `user:${verified.userId}`,
    identity: buildMcpIdentity(verified.userId, verified.scope),
  };
}

async function resolveAuthForApiKey(token: string): Promise<ResolvedAuth | null> {
  const apiKey = await verifyMcpApiKey(token);
  if (!apiKey) return null;
  return { rateLimitKeySuffix: apiKey.id, identity: null };
}

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!bearerToken) return unauthorizedResponse("Missing Authorization: Bearer <token> header");

  const resolvedAuth = bearerToken.startsWith(ACCESS_TOKEN_PREFIX)
    ? await resolveAuthForAccessToken(bearerToken)
    : await resolveAuthForApiKey(bearerToken);

  if (!resolvedAuth) return unauthorizedResponse("Invalid or expired token", "invalid_token");

  const limiterKind = (await isToolCallRequest(request)) ? "mcp" : "mcpMeta";
  const rateLimitResponse = await applyRateLimit(request, limiterKind, resolvedAuth.rateLimitKeySuffix);
  if (rateLimitResponse) return rateLimitResponse;

  const server = createAhorraMcpServer(resolvedAuth.identity);
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

function isToolCallMessage(message: unknown): boolean {
  return typeof message === "object" && message !== null && "method" in message && message.method === "tools/call";
}

/** Reads a clone of the body so the transport can still consume the original. */
async function isToolCallRequest(request: NextRequest): Promise<boolean> {
  try {
    const body: unknown = await request.clone().json();
    return Array.isArray(body) ? body.some(isToolCallMessage) : isToolCallMessage(body);
  } catch (error) {
    // Malformed JSON: count it against the stricter limit; the transport rejects it anyway.
    console.warn("[mcp] Could not parse request body for rate limiting:", error);
    return true;
  }
}

export function GET(): NextResponse {
  return methodNotAllowedResponse();
}

export function DELETE(): NextResponse {
  return methodNotAllowedResponse();
}
