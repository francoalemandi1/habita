"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { queryKeys, taskSummarySchema } from "@habita/contracts";
import { useAddShoppingListItem } from "@/hooks/use-shopping-list";
import { todayIsoDate } from "@/components/features/anotar/anotar-draft-types";
import { buildExpenseSplits } from "@/lib/anotar-expense-logic";
import { OFFLINE_MUTATION_KEYS } from "@/lib/offline-mutation-keys";
import { offlineMutationRetry } from "@/lib/offline-network";

import type { ExpenseCategory, TaskFrequency } from "@habita/contracts";

const createTaskResponseSchema = z.object({ task: taskSummarySchema });

export interface SaveExpenseInput {
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidById: string;
  participantIds: string[];
  /** yyyy-mm-dd */
  date: string;
  splitType: "EQUAL" | "CUSTOM";
  customSplits: Record<string, string>;
  chargeToFund: boolean;
  notes: string;
}

/**
 * Wraps POST /api/expenses behind a small hook so the R8c offline queue can
 * later intercept this one call site instead of the whole sheet.
 */
export function useAnotarSaveExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.anotarExpense,
    retry: offlineMutationRetry,
    mutationFn: (input: SaveExpenseInput) =>
      apiFetch("/api/expenses", {
        method: "POST",
        body: {
          title: input.title,
          amount: input.amount,
          category: input.category,
          paidById: input.paidById,
          // EQUAL here means "every chosen participant, evenly" (sent as CUSTOM amounts), never
          // the API's own EQUAL which always splits among every active household member.
          splitType: "CUSTOM",
          splits: buildExpenseSplits({
            amount: input.amount,
            splitType: input.splitType,
            participantIds: input.participantIds,
            customSplits: input.customSplits,
          }),
          date: new Date(`${input.date}T12:00:00`).toISOString(),
          notes: input.notes.trim() || undefined,
          chargeToFund: input.chargeToFund || undefined,
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
  description: string;
  /** 1-5; matches the "crear tarea" dialog's own default of 2 so quick-anotar tasks land mid-pack in the rotation algorithm. */
  weight: number;
  isRotating: boolean;
}

/**
 * Creates the task and always its first assignment, so Anotar never leaves an
 * orphan task: a chosen assignee goes through /api/assignments, "que lo
 * decida el reparto" goes through /api/assignments/auto-assign.
 */
export function useAnotarSaveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.anotarTask,
    retry: offlineMutationRetry,
    mutationFn: async (input: SaveTaskInput) => {
      const raw = await apiFetch<unknown>("/api/tasks", {
        method: "POST",
        body: {
          name: input.name,
          frequency: input.frequency,
          weight: input.weight,
          description: input.description.trim() || undefined,
          isRotating: input.isRotating || undefined,
        },
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

/**
 * Fires every item's add mutation concurrently instead of awaiting them one
 * by one — offline, a single paused item must not block the rest from being
 * queued (each gets its own clientId, so each gets its own PendingDot).
 */
export function useAnotarSaveItems() {
  const addItem = useAddShoppingListItem();

  async function saveItems(items: SaveItemInput[]): Promise<void> {
    await Promise.all(
      items.map((item) => addItem.mutateAsync({ name: item.name, quantity: item.quantity, clientId: crypto.randomUUID() })),
    );
  }

  return { saveItems, isPending: addItem.isPending };
}
