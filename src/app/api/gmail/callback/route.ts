import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

const STATE_COOKIE = "gmail_oauth_state";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * GET /api/gmail/callback
 * Handles the OAuth callback from Google after the user grants Gmail access.
 * Exchanges the authorization code for tokens and stores them in GmailConnection.
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // User denied consent
    if (error) {
      return NextResponse.redirect(`${baseUrl}/balance?gmailError=denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/balance?gmailError=missing_params`);
    }

    // Verify CSRF state
    const cookieStore = await cookies();
    const savedState = cookieStore.get(STATE_COOKIE)?.value;
    cookieStore.delete(STATE_COOKIE);

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${baseUrl}/balance?gmailError=invalid_state`);
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/gmail/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Gmail token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect(`${baseUrl}/balance?gmailError=token_exchange`);
    }

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokens.refresh_token) {
      console.error("Gmail OAuth: no refresh_token received. User may have already granted access.");
      // Still save what we have — next refresh will fail gracefully
    }

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

    await prisma.gmailConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiresAt,
        scope: tokens.scope,
      },
      update: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
        expiresAt,
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(`${baseUrl}/balance?gmailConnected=true`);
  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(`${baseUrl}/balance?gmailError=internal`);
  }
}
