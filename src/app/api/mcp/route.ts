import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { verifyMcpApiKey } from "@/lib/mcp/api-keys";
import { createAhorraMcpServer } from "@/lib/mcp/server";
import { applyRateLimit } from "@/lib/rate-limit";

import type { NextRequest } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

// ============================================
// POST /api/mcp — Ahorrá MCP (Streamable HTTP, stateless)
//
// Auth: per-consumer API key (McpApiKey table) via `Authorization: Bearer <key>`.
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

function unauthorizedResponse(message: string): NextResponse {
  return NextResponse.json(
    { jsonrpc: JSON_RPC_VERSION, error: { code: -32001, message }, id: null },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
  );
}

function methodNotAllowedResponse(): NextResponse {
  return NextResponse.json(
    { jsonrpc: JSON_RPC_VERSION, error: { code: -32601, message: "Method not allowed" }, id: null },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const apiKeyValue = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!apiKeyValue) return unauthorizedResponse("Missing Authorization: Bearer <key> header");

  const apiKey = await verifyMcpApiKey(apiKeyValue);
  if (!apiKey) return unauthorizedResponse("Invalid or revoked API key");

  const rateLimitResponse = await applyRateLimit(request, "mcp", apiKey.id);
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
