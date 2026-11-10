/**
 * MCP tool: get_household.
 *
 * Returns the user's households (id, name) and the members of the selected
 * one (id, name, memberType).
 */

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { MemberType } from "@prisma/client";
import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const getHouseholdInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
};

interface GetHouseholdOutput {
  households: Array<{ id: string; name: string; city: string | null }>;
  members: Array<{ id: string; name: string; memberType: MemberType }>;
}

export async function handleGetHousehold(
  identity: McpIdentity,
  args: { householdId?: string },
): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    const households = await prisma.member.findMany({
      where: { userId: identity.userId, isActive: true },
      select: { household: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: "asc" },
    });

    const members = await prisma.member.findMany({
      where: { householdId: resolved.member.householdId, isActive: true },
      select: { id: true, name: true, memberType: true },
    });

    const result: GetHouseholdOutput = {
      households: households.map((membership) => membership.household),
      members,
    };

    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/get_household] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to fetch household data. Please try again." }], isError: true };
  }
}
