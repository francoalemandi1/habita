/**
 * MCP tool: list_my_tasks.
 *
 * Returns the caller's pending task assignments (not completed, not
 * cancelled), ordered by due date, capped at 50.
 */

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { AssignmentStatus } from "@prisma/client";
import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const MAX_TASKS = 50;
const DONE_STATUSES: AssignmentStatus[] = ["COMPLETED", "CANCELLED"];

export const listMyTasksInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
};

interface ListMyTasksOutput {
  assignments: Array<{ id: string; taskName: string; dueDate: Date; status: AssignmentStatus }>;
}

export async function handleListMyTasks(identity: McpIdentity, args: { householdId?: string }): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    const assignments = await prisma.assignment.findMany({
      where: {
        householdId: resolved.member.householdId,
        memberId: resolved.member.id,
        status: { notIn: DONE_STATUSES },
      },
      select: { id: true, dueDate: true, status: true, task: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: MAX_TASKS,
    });

    const result: ListMyTasksOutput = {
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        taskName: assignment.task.name,
        dueDate: assignment.dueDate,
        status: assignment.status,
      })),
    };

    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/list_my_tasks] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to fetch tasks. Please try again." }], isError: true };
  }
}
