import { createHmac, randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

import type { MobileAuthSession } from "@prisma/client";

const ACCESS_TOKEN_PREFIX = "mob_at_";
const REFRESH_TOKEN_PREFIX = "mob_rt_";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 1 day
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function tokenExpiresIn(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

function createToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString("hex")}`;
}

function getMobileTokenSecret(): string {
  const secret = process.env.MOBILE_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MOBILE_TOKEN_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

function hashToken(rawToken: string): string {
  return createHmac("sha256", getMobileTokenSecret()).update(rawToken).digest("hex");
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

interface CreateStoredTokenInput {
  userId: string;
  tokenKind: "ACCESS" | "REFRESH";
  tokenFamilyId: string;
  deviceId: string | null;
  ttlSeconds: number;
}

interface CreatedStoredToken {
  rawToken: string;
  record: MobileAuthSession;
}

interface MobileAuthDb {
  mobileAuthSession: {
    create: typeof prisma.mobileAuthSession.create;
  };
}

async function createStoredToken(db: MobileAuthDb, input: CreateStoredTokenInput): Promise<CreatedStoredToken> {
  const prefix = input.tokenKind === "ACCESS" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX;
  const rawToken = createToken(prefix);
  const tokenHash = hashToken(rawToken);

  const record = await db.mobileAuthSession.create({
    data: {
      userId: input.userId,
      tokenKind: input.tokenKind,
      tokenHash,
      tokenFamilyId: input.tokenFamilyId,
      deviceId: input.deviceId,
      expiresAt: tokenExpiresIn(input.ttlSeconds),
    },
  });

  return { rawToken, record };
}

export interface MobileTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

interface IssueTokenPairInput {
  userId: string;
  tokenFamilyId?: string;
  deviceId?: string | null;
}

export async function issueMobileTokenPair(input: IssueTokenPairInput): Promise<MobileTokenPair> {
  const tokenFamilyId = input.tokenFamilyId ?? randomUUID();
  const [accessToken, refreshToken] = await Promise.all([
    createStoredToken(prisma, {
      userId: input.userId,
      tokenKind: "ACCESS",
      tokenFamilyId,
      deviceId: input.deviceId ?? null,
      ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    }),
    createStoredToken(prisma, {
      userId: input.userId,
      tokenKind: "REFRESH",
      tokenFamilyId,
      deviceId: input.deviceId ?? null,
      ttlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    }),
  ]);

  return {
    accessToken: accessToken.rawToken,
    refreshToken: refreshToken.rawToken,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function resolveMobileAccessTokenUserId(token: string): Promise<string | null> {
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) return null;
  const tokenHash = hashToken(token);

  const session = await prisma.mobileAuthSession.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { sessionInvalidatedAt: true } },
    },
  });

  if (!session) return null;
  if (session.tokenKind !== "ACCESS") return null;
  if (session.revokedAt) return null;
  if (isExpired(session.expiresAt)) {
    await prisma.mobileAuthSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  // Check if all sessions were invalidated after this token was issued
  if (session.user.sessionInvalidatedAt && session.issuedAt < session.user.sessionInvalidatedAt) {
    await prisma.mobileAuthSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  await prisma.mobileAuthSession.updateMany({
    where: { tokenHash, lastUsedAt: null },
    data: { lastUsedAt: new Date() },
  });

  return session.userId;
}

async function revokeTokenFamily(tokenFamilyId: string): Promise<void> {
  await prisma.mobileAuthSession.updateMany({
    where: { tokenFamilyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function rotateMobileRefreshToken(
  refreshToken: string,
  deviceId?: string | null,
): Promise<MobileTokenPair | null> {
  if (!refreshToken.startsWith(REFRESH_TOKEN_PREFIX)) return null;
  const tokenHash = hashToken(refreshToken);

  const refreshSession = await prisma.mobileAuthSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      tokenKind: true,
      tokenFamilyId: true,
      deviceId: true,
      expiresAt: true,
      revokedAt: true,
      rotatedAt: true,
      replacedById: true,
    },
  });

  if (!refreshSession) return null;
  if (refreshSession.tokenKind !== "REFRESH") return null;
  if (refreshSession.revokedAt || isExpired(refreshSession.expiresAt)) {
    await revokeTokenFamily(refreshSession.tokenFamilyId);
    return null;
  }

  if (refreshSession.rotatedAt || refreshSession.replacedById) {
    await revokeTokenFamily(refreshSession.tokenFamilyId);
    return null;
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.mobileAuthSession.updateMany({
      where: {
        tokenFamilyId: refreshSession.tokenFamilyId,
        tokenKind: "ACCESS",
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    const nextAccess = await createStoredToken(tx, {
      userId: refreshSession.userId,
      tokenKind: "ACCESS",
      tokenFamilyId: refreshSession.tokenFamilyId,
      deviceId: deviceId ?? refreshSession.deviceId ?? null,
      ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    });
    const nextRefresh = await createStoredToken(tx, {
      userId: refreshSession.userId,
      tokenKind: "REFRESH",
      tokenFamilyId: refreshSession.tokenFamilyId,
      deviceId: deviceId ?? refreshSession.deviceId ?? null,
      ttlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    });

    await tx.mobileAuthSession.update({
      where: { id: refreshSession.id },
      data: {
        rotatedAt: now,
        revokedAt: now,
        lastUsedAt: now,
        replacedById: nextRefresh.record.id,
      },
    });

    return {
      accessToken: nextAccess.rawToken,
      refreshToken: nextRefresh.rawToken,
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    };
  });
}

export async function revokeMobileTokens(input: {
  accessToken?: string;
  refreshToken?: string;
}): Promise<void> {
  const now = new Date();
  const accessTokenHash = input.accessToken ? hashToken(input.accessToken) : null;
  const refreshTokenHash = input.refreshToken ? hashToken(input.refreshToken) : null;
  if (!accessTokenHash && !refreshTokenHash) return;

  const matched = await prisma.mobileAuthSession.findFirst({
    where: {
      OR: [
        ...(accessTokenHash ? [{ tokenHash: accessTokenHash }] : []),
        ...(refreshTokenHash ? [{ tokenHash: refreshTokenHash }] : []),
      ],
    },
    select: { tokenFamilyId: true },
  });

  if (!matched) return;
  await prisma.mobileAuthSession.updateMany({
    where: { tokenFamilyId: matched.tokenFamilyId, revokedAt: null },
    data: { revokedAt: now },
  });
}

// ─── Auth Code (short-lived, for deep link callback) ────────────────

const AUTH_CODE_TTL_MS = 60_000; // 60 seconds

/**
 * Create a short-lived, signed auth code for the mobile OAuth callback.
 * Returned in the deep link URL instead of actual tokens.
 */
export function createMobileAuthCode(userId: string): string {
  const payload = JSON.stringify({
    sub: userId,
    exp: Date.now() + AUTH_CODE_TTL_MS,
    purpose: "mobile_auth_code",
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", getMobileTokenSecret()).update(payload).digest("base64url");
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a mobile auth code. Returns the userId if valid, null otherwise.
 */
export function verifyMobileAuthCode(code: string): string | null {
  const dotIndex = code.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = code.slice(0, dotIndex);
  const signature = code.slice(dotIndex + 1);

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSignature = createHmac("sha256", getMobileTokenSecret()).update(payload).digest("base64url");
  if (signature !== expectedSignature) return null;

  try {
    const data = JSON.parse(payload) as { sub?: string; exp?: number; purpose?: string };
    if (data.purpose !== "mobile_auth_code") return null;
    if (typeof data.exp !== "number" || Date.now() > data.exp) return null;
    if (typeof data.sub !== "string" || !data.sub) return null;
    return data.sub;
  } catch {
    return null;
  }
}

// ─── Revoke all sessions for a user ─────────────────────────────────

export async function revokeAllUserMobileSessions(userId: string): Promise<number> {
  const result = await prisma.mobileAuthSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

// ─── Cleanup ────────────────────────────────────────────────────────

export async function cleanupExpiredMobileAuthSessions(): Promise<{
  revokedExpired: number;
  deletedOldRevoked: number;
}> {
  const now = new Date();
  const retentionCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);

  const revokedExpired = await prisma.mobileAuthSession.updateMany({
    where: {
      expiresAt: { lte: now },
      revokedAt: null,
    },
    data: { revokedAt: now },
  });

  const deletedOldRevoked = await prisma.mobileAuthSession.deleteMany({
    where: {
      revokedAt: { lte: retentionCutoff },
    },
  });

  return {
    revokedExpired: revokedExpired.count,
    deletedOldRevoked: deletedOldRevoked.count,
  };
}
