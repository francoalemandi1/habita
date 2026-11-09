import { NextResponse } from "next/server";

import { revokeToken } from "@/lib/mcp/oauth/tokens";

import type { NextRequest } from "next/server";

// ============================================
// POST /api/oauth/revoke — token revocation (RFC 7009)
//
// Always returns 200 regardless of whether the token existed, per spec.
// Called server-to-server by Claude without cookies — no CSRF check here.
// ============================================

export const runtime = "nodejs";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

function oauthErrorResponse(error: string, description: string, status: number): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: CORS_HEADERS },
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, string>;
  try {
    body = await parseBody(request);
  } catch {
    return oauthErrorResponse("invalid_request", "Request body could not be parsed", 400);
  }

  const { token, client_id: clientId } = body;
  if (!token) {
    return oauthErrorResponse("invalid_request", "token is required", 400);
  }

  await revokeToken({ token, clientId: clientId ?? "" });

  return NextResponse.json({}, { status: 200, headers: CORS_HEADERS });
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
