/**
 * MCP tool: list_recent_expenses.
 *
 * Returns the household's most recent expenses, newest first.
 */

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;

export const listRecentExpensesInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
  limit: z
    .number()
    .int()
    .min(MIN_LIMIT)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe("Maximum number of expenses to return."),
};

interface ListRecentExpensesOutput {
  expenses: Array<{ id: string; title: string; amount: number; currency: string; paidByName: string; date: Date }>;
}

export async function handleListRecentExpenses(
  identity: McpIdentity,
  args: { householdId?: string; limit?: number },
): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    const expenses = await prisma.expense.findMany({
      where: { householdId: resolved.member.householdId },
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        date: true,
        paidBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: args.limit ?? DEFAULT_LIMIT,
    });

    const result: ListRecentExpensesOutput = {
      expenses: expenses.map((expense) => ({
        id: expense.id,
        title: expense.title,
        amount: expense.amount.toNumber(),
        currency: expense.currency,
        paidByName: expense.paidBy.name,
        date: expense.date,
      })),
    };

    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/list_recent_expenses] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to fetch recent expenses. Please try again." }], isError: true };
  }
}
