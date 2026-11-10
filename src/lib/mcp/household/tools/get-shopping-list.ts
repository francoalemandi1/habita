/**
 * MCP tool: get_shopping_list.
 *
 * Returns the household's shopping list, unchecked items first, capped at 200.
 */

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const MAX_ITEMS = 200;

export const getShoppingListInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
};

interface GetShoppingListOutput {
  items: Array<{ id: string; name: string; quantity: number; checked: boolean }>;
}

export async function handleGetShoppingList(
  identity: McpIdentity,
  args: { householdId?: string },
): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    const items = await prisma.shoppingListItem.findMany({
      where: { householdId: resolved.member.householdId },
      select: { id: true, name: true, quantity: true, checkedAt: true },
      orderBy: [{ checkedAt: { sort: "asc", nulls: "first" } }],
      take: MAX_ITEMS,
    });

    const result: GetShoppingListOutput = {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        checked: item.checkedAt !== null,
      })),
    };

    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/get_shopping_list] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to fetch the shopping list. Please try again." }], isError: true };
  }
}
