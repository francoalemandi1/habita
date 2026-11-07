/**
 * API key lifecycle for Ahorrá MCP: generation, hashing and verification.
 *
 * Keys are never stored in plaintext — only a sha256 hash is persisted, plus
 * a 12-char prefix for display in `scripts/mcp-keys.ts list`.
 */

import { randomBytes, createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "hmcp_";
const KEY_RANDOM_BYTES = 32;
const KEY_PREFIX_DISPLAY_LENGTH = 12;
const MAX_KEY_LENGTH = 100;
const LAST_USED_THROTTLE_MS = 10 * 60 * 1000;

export interface VerifiedMcpApiKey {
  id: string;
  name: string;
}

/** Generate a new plaintext API key. The caller is responsible for persisting its hash. */
export function generateMcpApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(KEY_RANDOM_BYTES).toString("base64url")}`;
}

/** sha256 hex digest of a plaintext key, used both to persist and to look up keys. */
export function hashMcpApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** First characters of a plaintext key, safe to display/store for identification. */
export function getKeyPrefix(key: string): string {
  return key.slice(0, KEY_PREFIX_DISPLAY_LENGTH);
}

/**
 * Verify a plaintext API key against the DB.
 * Returns `null` for malformed, unknown or revoked keys — never throws for those cases.
 */
export async function verifyMcpApiKey(key: string): Promise<VerifiedMcpApiKey | null> {
  if (!key.startsWith(KEY_PREFIX) || key.length > MAX_KEY_LENGTH) return null;

  const keyHash = hashMcpApiKey(key);
  const record = await prisma.mcpApiKey.findUnique({
    where: { keyHash },
    select: { id: true, name: true, revokedAt: true, lastUsedAt: true },
  });

  if (!record || record.revokedAt) return null;

  if (shouldThrottleLastUsedUpdate(record.lastUsedAt)) {
    touchLastUsed(record.id);
  }

  return { id: record.id, name: record.name };
}

function shouldThrottleLastUsedUpdate(lastUsedAt: Date | null): boolean {
  if (!lastUsedAt) return true;
  return Date.now() - lastUsedAt.getTime() >= LAST_USED_THROTTLE_MS;
}

/** Fire-and-forget lastUsedAt update — never blocks or fails the verifying request. */
function touchLastUsed(id: string): void {
  prisma.mcpApiKey
    .update({ where: { id }, data: { lastUsedAt: new Date() } })
    .catch((error: unknown) => {
      console.error("[mcp/api-keys] Failed to update lastUsedAt:", error);
    });
}
