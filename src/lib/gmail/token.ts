import { prisma } from "@/lib/prisma";

interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/** Margin in seconds before expiry to trigger a refresh. */
const EXPIRY_MARGIN_SECONDS = 300;

/**
 * Get a valid Gmail access token for the given user.
 * Refreshes automatically if expired. Returns null if no connection exists.
 */
export async function getGmailAccessToken(userId: string): Promise<string | null> {
  const connection = await prisma.gmailConnection.findUnique({
    where: { userId },
  });

  if (!connection) return null;

  const nowEpoch = Math.floor(Date.now() / 1000);
  const isExpired = connection.expiresAt < nowEpoch + EXPIRY_MARGIN_SECONDS;

  if (!isExpired) {
    return connection.accessToken;
  }

  // Token expired — refresh it
  if (!connection.refreshToken) {
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.error("Gmail token refresh failed:", await response.text());
    // Connection is stale — delete it so UI shows "Conectar Gmail" again
    await prisma.gmailConnection.delete({ where: { userId } });
    return null;
  }

  const tokens = (await response.json()) as GoogleRefreshResponse;
  const newExpiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

  await prisma.gmailConnection.update({
    where: { userId },
    data: {
      accessToken: tokens.access_token,
      expiresAt: newExpiresAt,
    },
  });

  return tokens.access_token;
}

/**
 * Check if a user has a Gmail connection (without fetching/refreshing token).
 */
export async function hasGmailConnection(userId: string): Promise<boolean> {
  const count = await prisma.gmailConnection.count({ where: { userId } });
  return count > 0;
}
