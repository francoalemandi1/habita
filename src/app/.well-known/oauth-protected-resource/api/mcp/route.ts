import { NextResponse } from "next/server";

import { getMcpResourceUrl, getOAuthIssuer } from "@/lib/mcp/oauth/urls";
import { OAUTH_SCOPE } from "@/lib/mcp/oauth/constants";

// ============================================
// GET /.well-known/oauth-protected-resource/api/mcp
//
// RFC 9728 §3.1 path-suffixed variant of the protected resource metadata,
// resolved from the `resource_metadata` parameter some clients build by
// appending the resource's path to the well-known prefix.
// ============================================

const CACHE_CONTROL = "public, max-age=3600";
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export function GET(): NextResponse {
  return NextResponse.json(
    {
      resource: getMcpResourceUrl(),
      authorization_servers: [getOAuthIssuer()],
      scopes_supported: [OAUTH_SCOPE],
      bearer_methods_supported: ["header"],
      resource_name: "Ahorrá (Habita)",
    },
    { headers: { "Cache-Control": CACHE_CONTROL, ...CORS_HEADERS } },
  );
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
