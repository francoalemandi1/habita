"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { queryKeys, taskSummarySchema } from "@habita/contracts";
import { splitEvenlyExact } from "@habita/domain";
import { useAddShoppingListItem } from "@/hooks/use-shopping-list";
import { todayIsoDate } from "@/components/features/anotar/anotar-draft-types";

import type { ExpenseCategory, TaskFrequency } from "@habita/contracts";

const createTaskResponseSchema = z.object({ task: taskSummarySchema });

/** Matches the "crear tarea" dialog's own default (2 of 5) so quick-anotar tasks land mid-pack in the rotation algorithm. */
const DEFAULT_ANOTAR_TASK_WEIGHT = 2;

export interface SaveExpenseInput {
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidById: string;
  participantIds: string[];
  /** yyyy-mm-dd */
  date: string;
}

/**
 * Wraps POST /api/expenses behind a small hook so the R8c offline queue can
 * later intercept this one call site instead of the whole sheet.
 */
export function useAnotarSaveExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveExpenseInput) =>
      apiFetch("/api/expenses", {
        method: "POST",
        body: {
          title: input.title,
          amount: input.amount,
          category: input.category,
          paidById: input.paidById,
          // CUSTOM, not EQUAL: EQUAL always splits among every active member and would ignore the chosen subset.
          splitType: "CUSTOM",
          splits: splitEvenlyExact(input.amount, input.participantIds),
          date: new Date(`${input.date}T12:00:00`).toISOString(),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.balances() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.insights() });
    },
  });
}

export interface SaveTaskInput {
  name: string;
  frequency: TaskFrequency;
  assigneeId: string | null;
  /** yyyy-mm-dd; defaults to today when the parse/form left it unset. */
  dueDate: string | null;
}

/**
 * Creates the task and always its first assignment, so Anotar never leaves an
 * orphan task: a chosen assignee goes through /api/assignments, "que lo
 * decida el reparto" goes through /api/assignments/auto-assign.
 */
export function useAnotarSaveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveTaskInput) => {
      const raw = await apiFetch<unknown>("/api/tasks", {
        method: "POST",
        body: { name: input.name, frequency: input.frequency, weight: DEFAULT_ANOTAR_TASK_WEIGHT },
      });
      const parsed = createTaskResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn("useAnotarSaveTask: invalid /api/tasks response", parsed.error);
        throw new Error("invalid_task_response");
      }
      const { task } = parsed.data;
      const dueDateIso = new Date(`${input.dueDate ?? todayIsoDate()}T12:00:00`).toISOString();

      if (input.assigneeId) {
        await apiFetch("/api/assignments", {
          method: "POST",
          body: { taskId: task.id, memberId: input.assigneeId, dueDate: dueDateIso },
        });
      } else {
        await apiFetch("/api/assignments/auto-assign", {
          method: "POST",
          body: { taskId: task.id, dueDate: dueDateIso },
        });
      }

      return task;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all() });
    },
  });
}

export interface SaveItemInput {
  name: string;
  quantity: number;
}

/** Adds each item one call at a time; duplicates bump quantity server-side. */
export function useAnotarSaveItems() {
  const addItem = useAddShoppingListItem();

  async function saveItems(items: SaveItemInput[]): Promise<void> {
    for (const item of items) {
      await addItem.mutateAsync({ name: item.name, quantity: item.quantity, clientId: crypto.randomUUID() });
    }
  }

  return { saveItems, isPending: addItem.isPending };
}
