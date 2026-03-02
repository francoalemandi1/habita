interface GoogleTokenInfo {
  iss?: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  exp?: string;
}

export interface VerifiedGoogleIdentity {
  providerAccountId: string;
  email: string;
  name: string | null;
  image: string | null;
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity | null> {
  const expectedAudience = process.env.GOOGLE_CLIENT_ID;
  if (!expectedAudience) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleTokenInfo;
  const issuer = payload.iss ?? "";
  if (
    issuer !== "accounts.google.com" &&
    issuer !== "https://accounts.google.com"
  ) {
    return null;
  }

  if (payload.aud !== expectedAudience) {
    return null;
  }
  if (!payload.sub) {
    return null;
  }
  if (!payload.email) {
    return null;
  }
  if (payload.email_verified !== "true") {
    return null;
  }
  if (!payload.exp || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    providerAccountId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? null,
    image: payload.picture ?? null,
  };
}
