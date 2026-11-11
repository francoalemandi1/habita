/**
 * MCP tool: complete_task.
 *
 * Marks a household task assignment as completed, mirroring
 * POST /api/assignments/[assignmentId]/complete. Idempotent: completing an
 * already-completed assignment is a no-op success.
 */

import { z } from "zod";

import { completeAssignment } from "@/lib/assignment-complete";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const completeTaskInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
  assignmentId: z.string().min(1).max(64).describe("Id of the task assignment to complete."),
  notes: z.string().max(500).optional().describe("Optional notes about the completion."),
};

interface CompleteTaskArgs {
  householdId?: string;
  assignmentId: string;
  notes?: string;
}

interface CompleteTaskOutput {
  assignment: { id: string; status: string };
  alreadyCompleted?: true;
  task?: { name: string };
  completedBy?: { id: string; name: string };
  nextAssignment?: { id: string; memberId: string; dueDate: Date };
  planFinalized?: boolean;
}

export async function handleCompleteTask(identity: McpIdentity, args: CompleteTaskArgs): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    const result = await completeAssignment({
      householdId: resolved.member.householdId,
      assignmentId: args.assignmentId,
      member: { id: resolved.member.id, name: resolved.member.name },
      notes: args.notes,
    });

    if (result.kind === "not_found") {
      return { content: [{ type: "text", text: "Assignment not found in this household." }], isError: true };
    }

    if (result.kind === "cancelled") {
      return { content: [{ type: "text", text: "This task assignment was cancelled." }], isError: true };
    }

    if (result.kind === "already_completed") {
      const output: CompleteTaskOutput = {
        assignment: { id: args.assignmentId, status: "COMPLETED" },
        alreadyCompleted: true,
      };
      return { content: [{ type: "text", text: JSON.stringify(output) }] };
    }

    const output: CompleteTaskOutput = {
      assignment: { id: result.assignment.id, status: result.assignment.status },
      task: { name: result.assignment.task.name },
      completedBy: result.completedBy,
      nextAssignment: result.nextAssignment,
      planFinalized: result.planFinalized,
    };
    return { content: [{ type: "text", text: JSON.stringify(output) }] };
  } catch (error) {
    console.error("[mcp/complete_task] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to complete the task. Please try again." }], isError: true };
  }
}
