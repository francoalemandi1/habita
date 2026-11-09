import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/api-response";
import { createAuthorizationCode } from "@/lib/mcp/oauth/codes";
import { buildRedirectUrl, validateAuthorizeRequest } from "@/lib/mcp/oauth/authorize-request";
import { getOAuthIssuer } from "@/lib/mcp/oauth/urls";
import { UnauthorizedError } from "@/lib/errors";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const MAX_PARAM_LENGTH = 2048;

const authorizeDecisionBodySchema = z.object({
  decision: z.enum(["approve", "deny"]),
  response_type: z.string().max(MAX_PARAM_LENGTH).optional(),
  client_id: z.string().max(MAX_PARAM_LENGTH).optional(),
  redirect_uri: z.string().max(MAX_PARAM_LENGTH).optional(),
  code_challenge: z.string().max(MAX_PARAM_LENGTH).optional(),
  code_challenge_method: z.string().max(MAX_PARAM_LENGTH).optional(),
  scope: z.string().max(MAX_PARAM_LENGTH).optional(),
  resource: z.string().max(MAX_PARAM_LENGTH).optional(),
  state: z.string().max(MAX_PARAM_LENGTH).optional(),
});

/**
 * POST /api/oauth/authorize
 * Processes the consent decision from the `/oauth/authorize` page. Returns a
 * `redirectUrl` instead of redirecting directly: the browser navigates to it
 * client-side, which the CSP `form-action` directive does not constrain.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const body = authorizeDecisionBodySchema.parse(await request.json());
    const result = await validateAuthorizeRequest(body);

    if (result.kind === "fatal") {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    if (result.kind === "redirect-error") {
      return NextResponse.json({ redirectUrl: result.redirectUrl });
    }

    if (body.decision === "deny") {
      const redirectUrl = buildRedirectUrl(result.redirectUri, {
        error: "access_denied",
        state: result.state,
      });
      return NextResponse.json({ redirectUrl });
    }

    const code = await createAuthorizationCode({
      clientId: result.client.id,
      userId: session.user.id,
      redirectUri: result.redirectUri,
      codeChallenge: result.codeChallenge,
      scope: result.scope,
      resource: result.resource,
    });

    const redirectUrl = buildRedirectUrl(result.redirectUri, {
      code,
      state: result.state,
      iss: getOAuthIssuer(),
    });

    return NextResponse.json({ redirectUrl });
  } catch (error) {
    return handleApiError(error, { route: "/api/oauth/authorize", method: "POST" });
  }
}
