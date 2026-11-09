import { createHash, randomBytes, randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import {
  ACCESS_TOKEN_PREFIX,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_PREFIX,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./constants";

import type { McpOAuthToken, McpOAuthTokenKind } from "@prisma/client";

const LAST_USED_THROTTLE_MS = 10 * 60 * 1000;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

function tokenExpiresIn(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

interface CreateStoredTokenInput {
  clientId: string;
  userId: string;
  kind: McpOAuthTokenKind;
  familyId: string;
  scope: string;
  resource: string;
  ttlSeconds: number;
}

interface CreatedStoredToken {
  rawToken: string;
  record: McpOAuthToken;
}

interface McpOAuthTokenDb {
  mcpOAuthToken: {
    create: typeof prisma.mcpOAuthToken.create;
  };
}

async function createStoredToken(db: McpOAuthTokenDb, input: CreateStoredTokenInput): Promise<CreatedStoredToken> {
  const prefix = input.kind === "ACCESS" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX;
  const rawToken = `${prefix}${randomBytes(32).toString("base64url")}`;

  const record = await db.mcpOAuthToken.create({
    data: {
      clientId: input.clientId,
      userId: input.userId,
      kind: input.kind,
      tokenHash: hashToken(rawToken),
      familyId: input.familyId,
      scope: input.scope,
      resource: input.resource,
      expiresAt: tokenExpiresIn(input.ttlSeconds),
    },
  });

  return { rawToken, record };
}

export interface McpOAuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scope: string;
}

export interface IssueTokenPairInput {
  clientId: string;
  userId: string;
  scope: string;
  resource: string;
  familyId?: string;
}

export async function issueTokenPair(input: IssueTokenPairInput): Promise<McpOAuthTokenPair> {
  const familyId = input.familyId ?? randomUUID();

  const [access, refresh] = await Promise.all([
    createStoredToken(prisma, {
      clientId: input.clientId,
      userId: input.userId,
      kind: "ACCESS",
      familyId,
      scope: input.scope,
      resource: input.resource,
      ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    }),
    createStoredToken(prisma, {
      clientId: input.clientId,
      userId: input.userId,
      kind: "REFRESH",
      familyId,
      scope: input.scope,
      resource: input.resource,
      ttlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    }),
  ]);

  return {
    accessToken: access.rawToken,
    refreshToken: refresh.rawToken,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    scope: input.scope,
  };
}

export interface VerifiedAccessToken {
  userId: string;
  clientId: string;
  scope: string;
}

export async function verifyAccessToken(raw: string, expectedResource: string): Promise<VerifiedAccessToken | null> {
  if (!raw.startsWith(ACCESS_TOKEN_PREFIX)) return null;
  const tokenHash = hashToken(raw);

  const token = await prisma.mcpOAuthToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { sessionInvalidatedAt: true } } },
  });

  if (!token) return null;
  if (token.kind !== "ACCESS") return null;
  if (token.revokedAt) return null;
  if (isExpired(token.expiresAt)) return null;
  if (token.resource !== expectedResource) return null;
  if (token.user.sessionInvalidatedAt && token.issuedAt < token.user.sessionInvalidatedAt) return null;

  if (shouldThrottleLastUsedUpdate(token.lastUsedAt)) {
    touchLastUsed(token.id);
  }

  return { userId: token.userId, clientId: token.clientId, scope: token.scope };
}

function shouldThrottleLastUsedUpdate(lastUsedAt: Date | null): boolean {
  if (!lastUsedAt) return true;
  return Date.now() - lastUsedAt.getTime() >= LAST_USED_THROTTLE_MS;
}

/** Fire-and-forget lastUsedAt update — never blocks or fails the verifying request. */
function touchLastUsed(id: string): void {
  prisma.mcpOAuthToken.update({ where: { id }, data: { lastUsedAt: new Date() } }).catch((error: unknown) => {
    console.error("[mcp/oauth/tokens] Failed to update lastUsedAt:", error);
  });
}

async function revokeFamily(familyId: string): Promise<void> {
  await prisma.mcpOAuthToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export interface RotateRefreshTokenInput {
  refreshToken: string;
  clientId: string;
}

/** Rotates a refresh token. Reuse of an already-rotated/revoked token revokes its whole family. */
export async function rotateRefreshToken(input: RotateRefreshTokenInput): Promise<McpOAuthTokenPair | null> {
  if (!input.refreshToken.startsWith(REFRESH_TOKEN_PREFIX)) return null;
  const tokenHash = hashToken(input.refreshToken);

  const stored = await prisma.mcpOAuthToken.findUnique({ where: { tokenHash } });
  if (!stored) return null;
  if (stored.kind !== "REFRESH") return null;
  if (stored.clientId !== input.clientId) return null;

  if (stored.revokedAt || isExpired(stored.expiresAt)) {
    await revokeFamily(stored.familyId);
    return null;
  }

  if (stored.rotatedAt) {
    await revokeFamily(stored.familyId);
    return null;
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // Claim the token atomically: a concurrent rotation of the same token loses here.
    const claimed = await tx.mcpOAuthToken.updateMany({
      where: { id: stored.id, rotatedAt: null, revokedAt: null },
      data: { rotatedAt: now, revokedAt: now, lastUsedAt: now },
    });
    if (claimed.count !== 1) return null;

    await tx.mcpOAuthToken.updateMany({
      where: { familyId: stored.familyId, kind: "ACCESS", revokedAt: null },
      data: { revokedAt: now },
    });

    const nextAccess = await createStoredToken(tx, {
      clientId: stored.clientId,
      userId: stored.userId,
      kind: "ACCESS",
      familyId: stored.familyId,
      scope: stored.scope,
      resource: stored.resource,
      ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    });
    const nextRefresh = await createStoredToken(tx, {
      clientId: stored.clientId,
      userId: stored.userId,
      kind: "REFRESH",
      familyId: stored.familyId,
      scope: stored.scope,
      resource: stored.resource,
      ttlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    });

    return {
      accessToken: nextAccess.rawToken,
      refreshToken: nextRefresh.rawToken,
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      scope: stored.scope,
    };
  });
}

export interface RevokeTokenInput {
  token: string;
  clientId: string;
}

/** RFC 7009: always succeeds silently from the caller's point of view. */
export async function revokeToken(input: RevokeTokenInput): Promise<void> {
  const tokenHash = hashToken(input.token);
  const stored = await prisma.mcpOAuthToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.clientId !== input.clientId) return;
  await revokeFamily(stored.familyId);
}
