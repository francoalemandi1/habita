/**
 * Manage Ahorrá MCP API keys: create, list, revoke.
 *
 * Usage:
 *   pnpm exec tsx scripts/mcp-keys.ts create <name>
 *   pnpm exec tsx scripts/mcp-keys.ts list
 *   pnpm exec tsx scripts/mcp-keys.ts revoke <id>
 */

import { PrismaClient } from "@prisma/client";

import { generateMcpApiKey, getKeyPrefix, hashMcpApiKey } from "../src/lib/mcp/api-keys";

const prisma = new PrismaClient();

async function create(name: string): Promise<void> {
  const key = generateMcpApiKey();
  await prisma.mcpApiKey.create({
    data: { name, keyPrefix: getKeyPrefix(key), keyHash: hashMcpApiKey(key) },
  });
  console.log(`Created key "${name}". This is the only time the plaintext key is shown:\n`);
  console.log(key);
}

async function list(): Promise<void> {
  const keys = await prisma.mcpApiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });

  if (keys.length === 0) {
    console.log("No MCP API keys found.");
    return;
  }

  for (const key of keys) {
    const status = key.revokedAt ? `revoked ${key.revokedAt.toISOString()}` : "active";
    const lastUsed = key.lastUsedAt ? key.lastUsedAt.toISOString() : "never";
    console.log(
      `${key.id}  ${key.keyPrefix}...  ${key.name}  created=${key.createdAt.toISOString()}  lastUsed=${lastUsed}  ${status}`,
    );
  }
}

async function revoke(id: string): Promise<void> {
  const key = await prisma.mcpApiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  console.log(`Revoked key "${key.name}" (${key.id}).`);
}

async function main(): Promise<void> {
  const [command, arg] = process.argv.slice(2);

  switch (command) {
    case "create":
      if (!arg) throw new Error("Usage: mcp-keys.ts create <name>");
      await create(arg);
      break;
    case "list":
      await list();
      break;
    case "revoke":
      if (!arg) throw new Error("Usage: mcp-keys.ts revoke <id>");
      await revoke(arg);
      break;
    default:
      throw new Error("Usage: mcp-keys.ts create <name> | list | revoke <id>");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
