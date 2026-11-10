/**
 * MCP tool: get_expense_balances.
 *
 * Returns per-currency net balances and simplified settle-up transactions
 * for the household, reusing the same computation as the web balances page.
 */

import { z } from "zod";

import { getHouseholdBalances } from "@/lib/expense-balances";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const getExpenseBalancesInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
};

export async function handleGetExpenseBalances(
  identity: McpIdentity,
  args: { householdId?: string },
): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    const balances = await getHouseholdBalances(resolved.member.householdId);

    return { content: [{ type: "text", text: JSON.stringify(balances) }] };
  } catch (error) {
    console.error("[mcp/get_expense_balances] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to fetch expense balances. Please try again." }], isError: true };
  }
}
