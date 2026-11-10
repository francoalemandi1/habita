import { NextResponse } from "next/server";

import { getOAuthIssuer } from "@/lib/mcp/oauth/urls";
import { OAUTH_SCOPES } from "@/lib/mcp/oauth/constants";

// ============================================
// GET /.well-known/oauth-authorization-server
//
// RFC 8414 authorization server metadata for the hand-rolled Ahorrá
// authorization server (Next route handlers + Prisma, see OAUTH_PLAN.md).
// ============================================

const CACHE_CONTROL = "public, max-age=3600";
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export function GET(): NextResponse {
  const issuer = getOAuthIssuer();

  return NextResponse.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      registration_endpoint: `${issuer}/api/oauth/register`,
      revocation_endpoint: `${issuer}/api/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      revocation_endpoint_auth_methods_supported: ["none"],
      scopes_supported: [...OAUTH_SCOPES],
    },
    { headers: { "Cache-Control": CACHE_CONTROL, ...CORS_HEADERS } },
  );
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
