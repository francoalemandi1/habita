import { createHmac, randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

import type { MobileAuthSession } from "@prisma/client";

const ACCESS_TOKEN_PREFIX = "mob_at_";
const REFRESH_TOKEN_PREFIX = "mob_rt_";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

function tokenExpiresIn(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

function createToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString("hex")}`;
}

function getMobileTokenSecret(): string {
  const secret = process.env.MOBILE_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("MOBILE_TOKEN_SECRET or NEXTAUTH_SECRET must be configured");
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
    select: {
      userId: true,
      tokenKind: true,
      expiresAt: true,
      revokedAt: true,
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
