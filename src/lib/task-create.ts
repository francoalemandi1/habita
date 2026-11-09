import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { hasPermission } from "./permissions";
import { getBestAssignee } from "./assignment-algorithm";
import { BadRequestError, ForbiddenError, NotFoundError } from "./errors";

import type { MemberType, Task } from "@prisma/client";
import type { CreateTaskInput, InitialAssignmentInput } from "./validations/task";

const assignmentInclude = {
  task: { select: { id: true, name: true, weight: true } },
  member: { select: { id: true, name: true } },
} as const;

type AssignmentWithRelations = Prisma.AssignmentGetPayload<{ include: typeof assignmentInclude }>;

export interface CreateTaskIdempotentResult {
  task: Task;
  assignment: AssignmentWithRelations | null;
  isNew: boolean;
}

/**
 * Creates (or reuses, by idempotencyKey) a task, and optionally ensures its
 * first assignment. The task must be committed before an auto-assignment is
 * computed: `getBestAssignee` reads through the global Prisma client, which
 * cannot see a row created inside an uncommitted transaction.
 */
export async function createTaskIdempotent(params: {
  householdId: string;
  input: CreateTaskInput;
  requestingMemberType: MemberType;
}): Promise<CreateTaskIdempotentResult> {
  const { householdId, input, requestingMemberType } = params;
  const { idempotencyKey, initialAssignment, ...taskFields } = input;

  // Validated before anything is written: a rejected direct assignment must
  // never leave behind a task with no assignment.
  if (initialAssignment?.memberId) {
    await assertCanAssignDirectly({ householdId, requestingMemberType, memberId: initialAssignment.memberId });
  }

  const { task, isNew } = await findOrCreateTask({ householdId, taskFields, idempotencyKey });

  if (!initialAssignment) {
    return { task, assignment: null, isNew };
  }

  const assignment = await ensureInitialAssignment({ task, householdId, initialAssignment });

  return { task, assignment, isNew };
}

async function assertCanAssignDirectly(params: {
  householdId: string;
  requestingMemberType: MemberType;
  memberId: string;
}): Promise<void> {
  const { householdId, requestingMemberType, memberId } = params;

  if (!hasPermission(requestingMemberType, "task:assign")) {
    throw new ForbiddenError("No tenes permiso para asignar esta tarea");
  }

  const targetMember = await prisma.member.findFirst({
    where: { id: memberId, householdId, isActive: true },
    select: { id: true },
  });
  if (!targetMember) {
    throw new NotFoundError("Miembro");
  }
}

async function findOrCreateTask(params: {
  householdId: string;
  taskFields: Omit<CreateTaskInput, "idempotencyKey" | "initialAssignment">;
  idempotencyKey: string | undefined;
}): Promise<{ task: Task; isNew: boolean }> {
  const { householdId, taskFields, idempotencyKey } = params;

  if (idempotencyKey) {
    const existing = await prisma.task.findFirst({ where: { householdId, idempotencyKey } });
    if (existing) return { task: existing, isNew: false };
  }

  try {
    const task = await prisma.task.create({ data: { ...taskFields, householdId, idempotencyKey } });
    return { task, isNew: true };
  } catch (error) {
    // Race: another request inserted the same idempotencyKey first.
    if (idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.task.findFirst({ where: { householdId, idempotencyKey } });
      if (winner) return { task: winner, isNew: false };
    }
    throw error;
  }
}

async function ensureInitialAssignment(params: {
  task: Task;
  householdId: string;
  initialAssignment: InitialAssignmentInput;
}): Promise<AssignmentWithRelations> {
  const { task, householdId, initialAssignment } = params;
  const dueDate = initialAssignment.dueDate;

  if (initialAssignment.memberId === null) {
    const { best } = await getBestAssignee(householdId, task.id, dueDate);
    if (!best) {
      throw new BadRequestError("No hay miembros elegibles para esta tarea");
    }
    return ensureAssignmentRow({ taskId: task.id, householdId, memberId: best.memberId, dueDate });
  }

  // Permission + household membership were already validated by
  // assertCanAssignDirectly before the task was created.
  return ensureAssignmentRow({ taskId: task.id, householdId, memberId: initialAssignment.memberId, dueDate });
}

/**
 * Creates the task's first assignment, or reuses an existing one in ANY
 * status: a queued replay can arrive after that assignment was already
 * completed, and must not hand out a second one. Locks the task row so two
 * concurrent retries of the same save never both pass the existence check.
 */
async function ensureAssignmentRow(params: {
  taskId: string;
  householdId: string;
  memberId: string;
  dueDate: Date;
}): Promise<AssignmentWithRelations> {
  const { taskId, householdId, memberId, dueDate } = params;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${taskId} FOR UPDATE`;

    const existing = await tx.assignment.findFirst({
      where: { taskId, householdId },
      orderBy: { createdAt: "asc" },
      include: assignmentInclude,
    });
    if (existing) return existing;

    return tx.assignment.create({
      data: { taskId, memberId, householdId, dueDate },
      include: assignmentInclude,
    });
  });
}
