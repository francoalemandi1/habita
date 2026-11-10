/**
 * MCP tool: add_shopping_list_items.
 *
 * Adds one or more items to the household's shared shopping list, processed
 * sequentially so a BadRequestError on one item doesn't block the rest.
 */

import { z } from "zod";

import { addShoppingListItem } from "@/lib/shopping-list-service";
import { BadRequestError } from "@/lib/errors";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const MAX_ITEMS = 20;
const DEFAULT_QUANTITY = 1;

const addShoppingListItemInputSchema = z.object({
  name: z.string().trim().min(1).max(100).describe("Item name."),
  quantity: z.number().int().min(1).max(99).optional().describe("Quantity to add. Defaults to 1."),
  clientId: z
    .string()
    .min(8)
    .max(100)
    .regex(/^[^:]+$/)
    .describe("A fresh unique id generated for this item. Reuse the same value on retries — a replay returns the same item instead of adding a duplicate."),
});

export const addShoppingListItemsInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
  items: z
    .array(addShoppingListItemInputSchema)
    .min(1)
    .max(MAX_ITEMS)
    .describe(
      "Items to add, 1 to 20. Adding a name that matches an existing unchecked item bumps its quantity instead of duplicating it.",
    ),
};

interface AddShoppingListItemsArgs {
  householdId?: string;
  items: Array<{ name: string; quantity?: number; clientId: string }>;
}

type AddShoppingListItemResult =
  | { clientId: string; ok: true; item: { id: string; name: string; quantity: number; checked: boolean } }
  | { clientId: string; ok: false; error: string };

interface AddShoppingListItemsOutput {
  results: AddShoppingListItemResult[];
}

export async function handleAddShoppingListItems(
  identity: McpIdentity,
  args: AddShoppingListItemsArgs,
): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    const results: AddShoppingListItemResult[] = [];
    for (const item of args.items) {
      try {
        const added = await addShoppingListItem({
          householdId: resolved.member.householdId,
          addedById: resolved.member.id,
          name: item.name,
          quantity: item.quantity ?? DEFAULT_QUANTITY,
          clientId: item.clientId,
        });
        results.push({
          clientId: item.clientId,
          ok: true,
          item: { id: added.id, name: added.name, quantity: added.quantity, checked: added.checkedAt !== null },
        });
      } catch (error) {
        if (!(error instanceof BadRequestError)) throw error;
        results.push({ clientId: item.clientId, ok: false, error: error.message });
      }
    }

    const result: AddShoppingListItemsOutput = { results };
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/add_shopping_list_items] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to add items to the shopping list. Please try again." }], isError: true };
  }
}
