interface GoogleTokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
}

/**
 * Exchanges a Google OAuth authorization code for an id_token server-side.
 * Used by the mobile app when running on simulator (Web client + PKCE flow).
 * The code_verifier is sent by the client as part of the PKCE flow.
 */
export async function exchangeGoogleAuthCode(
  code: string,
  codeVerifier: string,
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: "habita://",
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || data.error || !data.id_token) {
    return null;
  }

  return data.id_token;
}
