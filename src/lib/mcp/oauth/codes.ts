import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { verifyPkceS256 } from "./pkce";
import { AUTHORIZATION_CODE_PREFIX, AUTHORIZATION_CODE_TTL_SECONDS } from "./constants";

function hashCode(rawCode: string): string {
  return createHash("sha256").update(rawCode).digest("hex");
}

export interface CreateAuthorizationCodeInput {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string;
}

/** Issues a single-use authorization code. Only its sha256 hash is persisted. */
export async function createAuthorizationCode(input: CreateAuthorizationCodeInput): Promise<string> {
  const rawCode = `${AUTHORIZATION_CODE_PREFIX}${randomBytes(32).toString("base64url")}`;

  await prisma.mcpOAuthCode.create({
    data: {
      codeHash: hashCode(rawCode),
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      scope: input.scope,
      resource: input.resource,
      expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_SECONDS * 1000),
    },
  });

  return rawCode;
}

export interface ConsumeAuthorizationCodeInput {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  resource: string;
}

export interface ConsumedAuthorizationCode {
  userId: string;
  scope: string;
  resource: string;
}

/**
 * Consumes a single-use authorization code. The `updateMany` + count check marks
 * it consumed atomically, so a concurrent replay always loses the race.
 */
export async function consumeAuthorizationCode(
  input: ConsumeAuthorizationCodeInput,
): Promise<ConsumedAuthorizationCode | null> {
  const codeHash = hashCode(input.code);
  const now = new Date();

  const consumed = await prisma.mcpOAuthCode.updateMany({
    where: { codeHash, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count !== 1) return null;

  const record = await prisma.mcpOAuthCode.findUnique({ where: { codeHash } });
  if (!record) return null;
  if (record.clientId !== input.clientId) return null;
  if (record.redirectUri !== input.redirectUri) return null;
  if (record.resource !== input.resource) return null;
  if (record.expiresAt.getTime() <= now.getTime()) return null;
  if (!verifyPkceS256(input.codeVerifier, record.codeChallenge)) return null;

  return { userId: record.userId, scope: record.scope, resource: record.resource };
}
