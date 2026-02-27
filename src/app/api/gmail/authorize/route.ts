import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const STATE_COOKIE = "gmail_oauth_state";

/**
 * GET /api/gmail/authorize
 * Initiates an incremental OAuth flow to request Gmail read-only access.
 * Does NOT modify the main NextAuth login — uses a separate consent flow.
 */
export async function GET() {
  try {
    await requireAuth();

    const state = randomBytes(32).toString("hex");

    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/gmail/callback`;

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GMAIL_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
      include_granted_scopes: "false",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return handleApiError(error, { route: "/api/gmail/authorize", method: "GET" });
  }
}
