import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import type { CreateExpenseInput, TaskFrequency } from "@habita/contracts";
import { mobileApi } from "@/lib/api";
import { createUniqueId } from "@/lib/unique-id";
import { useCreateExpense } from "./use-expenses";
import { useAddShoppingListItem } from "./use-shopping-list";
import { useCreateAssignment, useCreateTask } from "./use-task-management";

export interface SaveExpenseInput {
  kind: "expense";
  payload: CreateExpenseInput;
}

export interface SaveTaskInput {
  kind: "task";
  name: string;
  frequency: TaskFrequency;
  weight: number;
  dueDateIso: string;
  /** null → "Que lo decida el reparto": auto-assigned via POST /api/assignments/auto-assign. */
  assigneeMemberId: string | null;
}

export interface SaveItemInput {
  kind: "item";
  items: Array<{ name: string; quantity: number }>;
}

export type AnotarSaveInput = SaveExpenseInput | SaveTaskInput | SaveItemInput;

/**
 * Saves through the same mutations the classic forms use. Kept as its own hook
 * so R8c can add an offline queue in front of it without touching the sheet.
 */
export function useAnotarSave() {
  const createExpense = useCreateExpense();
  const createTask = useCreateTask();
  const createAssignment = useCreateAssignment();
  const addItem = useAddShoppingListItem();
  const queryClient = useQueryClient();

  const save = useCallback(
    async (input: AnotarSaveInput): Promise<void> => {
      if (input.kind === "expense") {
        await createExpense.mutateAsync(input.payload);
        return;
      }

      if (input.kind === "task") {
        const created = await createTask.mutateAsync({
          name: input.name,
          frequency: input.frequency,
          weight: input.weight,
          isRouletteEligible: input.assigneeMemberId === null,
          isRotating: false,
        });

        // Never leave a task without an assignment: a known assignee gets a direct
        // assignment, "Que lo decida el reparto" goes through the same auto-assign
        // algorithm the rotation uses (src/app/api/assignments/auto-assign/route.ts).
        if (input.assigneeMemberId) {
          await createAssignment.mutateAsync({
            taskId: created.task.id,
            memberId: input.assigneeMemberId,
            dueDate: input.dueDateIso,
          });
        } else {
          await mobileApi.post("/api/assignments/auto-assign", {
            taskId: created.task.id,
            dueDate: input.dueDateIso,
          });
          await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() });
        }
        return;
      }

      for (const item of input.items) {
        await addItem.mutateAsync({ name: item.name, quantity: item.quantity, clientId: createUniqueId() });
      }
    },
    [createExpense, createTask, createAssignment, addItem, queryClient],
  );

  const isSaving = createExpense.isPending || createTask.isPending || createAssignment.isPending || addItem.isPending;

  return { save, isSaving };
}
