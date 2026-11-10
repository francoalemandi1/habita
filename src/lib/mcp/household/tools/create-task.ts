/**
 * MCP tool: create_task.
 *
 * Creates (or, by idempotencyKey, reuses) a household task, mirroring
 * POST /api/tasks. When no explicit assignee is given, requests
 * auto-assignment to the best available member for the task's first due date.
 */

import { z } from "zod";

import { createTaskIdempotent } from "@/lib/task-create";
import { createTaskSchema } from "@/lib/validations/task";
import { computeDueDateForFrequency } from "@/lib/due-date";
import { hasPermission } from "@/lib/permissions";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

import type { McpIdentity } from "../../identity";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const createTaskInputSchema = {
  householdId: z.string().min(1).max(64).optional().describe("Household id to select, when the user belongs to more than one."),
  name: z.string().min(2).max(100).describe("Task name."),
  description: z.string().max(500).optional().describe("Optional task description."),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "ONCE"]).optional().describe("How often the task repeats. Defaults to WEEKLY."),
  weight: z.number().int().min(1).max(5).optional().describe("Task difficulty/weight, 1 to 5. Defaults to 1."),
  estimatedMinutes: z.number().int().min(1).max(480).optional().describe("Estimated minutes to complete the task."),
  idempotencyKey: z
    .string()
    .min(8)
    .max(100)
    .regex(/^[^:]+$/)
    .describe("A fresh unique id generated for this new task. Reuse the same value on retries — a replay returns the same task instead of creating a duplicate."),
  assignToMemberId: z.string().min(1).max(64).optional().describe("Member id to assign the task to directly. If omitted, the task is auto-assigned to the best available member."),
};

interface CreateTaskArgs {
  householdId?: string;
  name: string;
  description?: string;
  frequency?: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "ONCE";
  weight?: number;
  estimatedMinutes?: number;
  idempotencyKey: string;
  assignToMemberId?: string;
}

interface CreateTaskOutput {
  task: { id: string; name: string; frequency: string; weight: number };
  assignment: { id: string; memberId: string; memberName: string; dueDate: Date } | null;
  created: boolean;
}

export async function handleCreateTask(identity: McpIdentity, args: CreateTaskArgs): Promise<CallToolResult> {
  try {
    const resolved = await resolveMcpMember(identity.userId, args.householdId);
    if (resolved.kind !== "ok") return mcpMemberErrorToToolResult(resolved);

    if (!hasPermission(resolved.member.memberType, "task:create")) {
      return { content: [{ type: "text", text: "You don't have permission to create tasks." }], isError: true };
    }

    const now = new Date();
    const dueDate = computeDueDateForFrequency(args.frequency ?? "WEEKLY", now);

    const parsed = createTaskSchema.parse({
      name: args.name,
      description: args.description,
      frequency: args.frequency,
      weight: args.weight,
      estimatedMinutes: args.estimatedMinutes,
      idempotencyKey: args.idempotencyKey,
      initialAssignment: { memberId: args.assignToMemberId ?? null, dueDate },
    });

    const { task, assignment, isNew } = await createTaskIdempotent({
      householdId: resolved.member.householdId,
      input: parsed,
      requestingMemberType: resolved.member.memberType,
    });

    const output: CreateTaskOutput = {
      task: { id: task.id, name: task.name, frequency: task.frequency, weight: task.weight },
      assignment: assignment
        ? { id: assignment.id, memberId: assignment.memberId, memberName: assignment.member.name, dueDate: assignment.dueDate }
        : null,
      created: isNew,
    };
    return { content: [{ type: "text", text: JSON.stringify(output) }] };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ForbiddenError || error instanceof NotFoundError) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (error instanceof z.ZodError) {
      return { content: [{ type: "text", text: error.errors[0]?.message ?? "Invalid input" }], isError: true };
    }
    console.error("[mcp/create_task] Tool failed:", error);
    return { content: [{ type: "text", text: "Failed to create the task. Please try again." }], isError: true };
  }
}
