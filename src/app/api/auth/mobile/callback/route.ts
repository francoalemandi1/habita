import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueMobileTokenPair } from "@/lib/mobile-auth";
import { verifyGoogleIdToken } from "@/lib/google-id-token";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface GoogleTokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

/**
 * Handles the Google OAuth callback for the mobile app.
 * Exchanges the authorization code for tokens, creates/finds the user,
 * issues mobile tokens, and redirects back to the app via deep link.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error ?? !code) {
      return redirectToApp({ error: error ?? "oauth_cancelled" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return redirectToApp({ error: "server_misconfigured" });
    }

    // Must match exactly what was used in the authorization request
    const callbackUrl = process.env.MOBILE_OAUTH_CALLBACK_URL ?? "https://habita.vercel.app/api/auth/mobile/callback";

    // Exchange code for tokens
    const tokenBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
      cache: "no-store",
    });

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || tokenData.error || !tokenData.id_token) {
      return redirectToApp({ error: "token_exchange_failed" });
    }

    const identity = await verifyGoogleIdToken(tokenData.id_token);
    if (!identity) {
      return redirectToApp({ error: "invalid_id_token" });
    }

    const user = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: identity.providerAccountId,
          },
        },
        include: { user: true },
      });
      if (account?.user) return account.user;

      const userByEmail = await tx.user.findUnique({ where: { email: identity.email } });
      if (userByEmail) {
        await tx.account.create({
          data: {
            userId: userByEmail.id,
            type: "oauth",
            provider: "google",
            providerAccountId: identity.providerAccountId,
            id_token: tokenData.id_token,
          },
        });
        return userByEmail;
      }

      return tx.user.create({
        data: {
          email: identity.email,
          name: identity.name,
          image: identity.image,
          emailVerified: new Date(),
          accounts: {
            create: {
              type: "oauth",
              provider: "google",
              providerAccountId: identity.providerAccountId,
              id_token: tokenData.id_token,
            },
          },
        },
      });
    });

    const tokens = await issueMobileTokenPair({ userId: user.id, deviceId: null });

    return redirectToApp({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/mobile/callback", method: "GET" });
  }
}

function redirectToApp(params: Record<string, string>): NextResponse {
  const deepLink = new URL("habita://auth");
  for (const [key, value] of Object.entries(params)) {
    deepLink.searchParams.set(key, value);
  }
  const deepLinkUrl = deepLink.toString();

  // SFSafariViewController (used by openAuthSessionAsync) cannot follow HTTP
  // redirects to custom schemes — it just closes with "dismiss". We must serve
  // an HTML page that redirects via window.location so the OS can intercept it.
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=${deepLinkUrl}" />
  <script>window.location.replace(${JSON.stringify(deepLinkUrl)});</script>
</head>
<body>Redirigiendo a Habita...</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
