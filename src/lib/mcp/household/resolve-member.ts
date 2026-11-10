/**
 * Resolves which household `Member` an MCP household tool call should act
 * as, given the authenticated user and an optional explicit `householdId`.
 * Never trusts a household id alone: the caller must actually be an active
 * member of it.
 */

import { prisma } from "@/lib/prisma";

import type { Household, Member } from "@prisma/client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ResolvedMcpMember = Member & { household: Pick<Household, "id" | "name"> };

export type ResolveMcpMemberResult =
  | { kind: "ok"; member: ResolvedMcpMember }
  | { kind: "no_household" }
  | { kind: "not_a_member" }
  | { kind: "ambiguous"; households: Array<{ id: string; name: string }> };

export async function resolveMcpMember(userId: string, householdId?: string): Promise<ResolveMcpMemberResult> {
  const memberships = await prisma.member.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
    include: { household: { select: { id: true, name: true } } },
  });

  if (memberships.length === 0) return { kind: "no_household" };

  if (householdId) {
    const match = memberships.find((membership) => membership.householdId === householdId);
    return match ? { kind: "ok", member: match } : { kind: "not_a_member" };
  }

  if (memberships.length === 1) {
    const [only] = memberships;
    if (only) return { kind: "ok", member: only };
  }

  return {
    kind: "ambiguous",
    households: memberships.map((membership) => ({ id: membership.household.id, name: membership.household.name })),
  };
}

export function mcpMemberErrorToToolResult(result: Exclude<ResolveMcpMemberResult, { kind: "ok" }>): CallToolResult {
  if (result.kind === "no_household") {
    return { isError: true, content: [{ type: "text", text: "No household found for this user." }] };
  }

  if (result.kind === "not_a_member") {
    return { isError: true, content: [{ type: "text", text: "Not a member of the requested household." }] };
  }

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          error: "multiple_households",
          message: "Multiple households found. Retry with one of these as householdId.",
          households: result.households,
        }),
      },
    ],
  };
}
