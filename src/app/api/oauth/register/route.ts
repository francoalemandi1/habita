import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { registerClient } from "@/lib/mcp/oauth/clients";
import { applyRateLimit } from "@/lib/rate-limit";

import type { NextRequest } from "next/server";

// ============================================
// POST /api/oauth/register — Dynamic Client Registration (RFC 7591)
//
// Open endpoint (no auth) for public OAuth clients (Claude, Claude Code).
// Rate limited per IP to bound registration spam; stale unused clients
// (created > 24 h ago, no tokens issued) are lazily deleted on each call.
// ============================================

export const runtime = "nodejs";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };
const STALE_CLIENT_AGE_MS = 24 * 60 * 60 * 1000;

interface RegisterRequestBody {
  client_name?: unknown;
  redirect_uris?: unknown;
  token_endpoint_auth_method?: unknown;
}

function oauthErrorResponse(error: string, description: string, status: number): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: CORS_HEADERS },
  );
}

async function deleteStaleClients(): Promise<void> {
  try {
    await prisma.mcpOAuthClient.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - STALE_CLIENT_AGE_MS) }, tokens: { none: {} } },
    });
  } catch (error) {
    console.error("[oauth/register] Failed to delete stale clients:", error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await applyRateLimit(request, "oauth");
  if (rateLimitResponse) return rateLimitResponse;

  void deleteStaleClients();

  let body: RegisterRequestBody;
  try {
    body = (await request.json()) as RegisterRequestBody;
  } catch {
    return oauthErrorResponse("invalid_client_metadata", "Request body must be valid JSON", 400);
  }

  const authMethod = body.token_endpoint_auth_method;
  if (authMethod !== undefined && authMethod !== null && authMethod !== "none") {
    return oauthErrorResponse(
      "invalid_client_metadata",
      "Only the \"none\" token_endpoint_auth_method is supported (public clients)",
      400,
    );
  }

  const result = await registerClient({
    clientName: typeof body.client_name === "string" ? body.client_name : undefined,
    redirectUris: Array.isArray(body.redirect_uris) ? (body.redirect_uris as string[]) : [],
  });

  if (!result.ok) {
    return oauthErrorResponse(result.error, result.description, 400);
  }

  return NextResponse.json(
    {
      client_id: result.client.id,
      client_name: result.client.clientName,
      redirect_uris: result.client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_id_issued_at: Math.floor(result.client.createdAt.getTime() / 1000),
    },
    { status: 201, headers: CORS_HEADERS },
  );
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
