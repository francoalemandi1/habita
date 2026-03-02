import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

/**
 * Initiates Google OAuth for the mobile app.
 * The app opens this URL in a browser — it builds the Google authorization URL
 * and redirects there. Google then redirects back to /api/auth/mobile/callback.
 */
export function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("GOOGLE_CLIENT_ID not configured", { status: 500 });
  }

  // Always use the production URL for the callback — this must match exactly
  // what is registered in Google Console as an authorized redirect URI.
  const callbackUrl = process.env.MOBILE_OAUTH_CALLBACK_URL ?? "https://habita.vercel.app/api/auth/mobile/callback";

  // Pass through any state from the app (e.g. deep link return URL)
  const state = request.nextUrl.searchParams.get("state") ?? "";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid profile email",
    access_type: "offline",
    state,
    prompt: "select_account",
  });

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
