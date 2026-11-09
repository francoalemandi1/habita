import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { isAllowedRedirectUri } from "./redirect-uri";
import { MAX_CLIENT_NAME_LENGTH, MAX_REDIRECT_URIS } from "./constants";

import type { McpOAuthClient } from "@prisma/client";

const registerClientInputSchema = z.object({
  clientName: z.string().trim().max(MAX_CLIENT_NAME_LENGTH).optional(),
  redirectUris: z.array(z.string()).min(1).max(MAX_REDIRECT_URIS),
});

export interface RegisterClientInput {
  clientName?: string;
  redirectUris: string[];
}

export type RegisterClientResult =
  | { ok: true; client: McpOAuthClient }
  | { ok: false; error: "invalid_redirect_uri" | "invalid_client_metadata"; description: string };

/** Dynamic Client Registration (RFC 7591) for public OAuth clients. */
export async function registerClient(input: RegisterClientInput): Promise<RegisterClientResult> {
  const parsed = registerClientInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_client_metadata",
      description: parsed.error.issues[0]?.message ?? "Invalid client metadata",
    };
  }

  const invalidUri = parsed.data.redirectUris.find((uri) => !isAllowedRedirectUri(uri));
  if (invalidUri) {
    return {
      ok: false,
      error: "invalid_redirect_uri",
      description: `Redirect URI not allowed: ${invalidUri}`,
    };
  }

  const client = await prisma.mcpOAuthClient.create({
    data: {
      clientName: parsed.data.clientName,
      redirectUris: parsed.data.redirectUris,
    },
  });

  return { ok: true, client };
}

export async function getClient(clientId: string): Promise<McpOAuthClient | null> {
  return prisma.mcpOAuthClient.findUnique({ where: { id: clientId } });
}
