/**
 * MCP tool: set_shopping_list_item_checked.
 *
 * Checks or unchecks a shopping list item. Idempotent: setting an item to
 * its current state is a no-op.
 */

import { z } from "zod";

import { setShoppingListItemChecked } from "@/lib/shopping-list-service";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const setShoppingListItemCheckedInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
  itemId: z.string().min(1).max(64).describe("Id of the shopping list item to update."),
  checked: z.boolean().describe("Whether the item should be marked checked."),
};

interface SetShoppingListItemCheckedOutput {
  item: { id: string; name: string; quantity: number; checked: boolean };
}

export async function handleSetShoppingListItemChecked(
  identity: McpIdentity,
  args: { householdId?: string; itemId: string; checked: boolean },
): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    const updated = await setShoppingListItemChecked({
      householdId: resolved.member.householdId,
      itemId: args.itemId,
      memberId: resolved.member.id,
      checked: args.checked,
    });

    if (!updated) {
      return { content: [{ type: "text", text: "Item not found in this household." }], isError: true };
    }

    const result: SetShoppingListItemCheckedOutput = {
      item: { id: updated.id, name: updated.name, quantity: updated.quantity, checked: updated.checkedAt !== null },
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/set_shopping_list_item_checked] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to update the item. Please try again." }], isError: true };
  }
}
