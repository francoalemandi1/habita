import {
  onlineManager,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import type { CreateExpenseInput, TaskFrequency } from "@habita/contracts";
import { mobileApi } from "@/lib/api";
import { createUniqueId } from "@/lib/unique-id";
import { OFFLINE_MUTATION_KEYS } from "@/lib/offline-mutation-keys";
import { useSnackbar } from "@/components/ds";
import { useIsOnline } from "./use-is-online";

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
  description: string;
  isRotating: boolean;
}

export interface SaveItemInput {
  kind: "item";
  items: Array<{ name: string; quantity: number }>;
}

export type AnotarSaveInput = SaveExpenseInput | SaveTaskInput | SaveItemInput;

/**
 * A single queued mutation's variables — one item per mutation, never a batch
 * (see `save` below). The clientId is fixed here, not in the mutationFn, so a
 * retried or resumed add keeps the same id and the server can dedupe it.
 */
interface QueuedItemInput {
  kind: "queued-item";
  name: string;
  quantity: number;
  clientId: string;
}

type AnotarMutationInput = SaveExpenseInput | SaveTaskInput | QueuedItemInput;

/**
 * Standalone (no React) so it can be registered via `setMutationDefaults` and
 * survive an app restart. Talks to `mobileApi` directly rather than through
 * `useCreateExpense` / `useCreateTask` / `useAddShoppingListItem`, since those
 * hooks don't exist outside a mounted component and a resumed mutation does.
 */
export async function performAnotarSaveMutationFn(
  input: AnotarMutationInput,
): Promise<void> {
  if (input.kind === "expense") {
    await mobileApi.post("/api/expenses", input.payload);
    return;
  }

  if (input.kind === "task") {
    const created = await mobileApi.post<{ task: { id: string } }>(
      "/api/tasks",
      {
        name: input.name,
        frequency: input.frequency,
        weight: input.weight,
        isRouletteEligible: input.assigneeMemberId === null,
        isRotating: input.isRotating,
        description: input.description.trim() || undefined,
      },
    );

    // Never leave a task without an assignment: a known assignee gets a direct
    // assignment, "Que lo decida el reparto" goes through the same auto-assign
    // algorithm the rotation uses (src/app/api/assignments/auto-assign/route.ts).
    if (input.assigneeMemberId) {
      await mobileApi.post("/api/assignments", {
        taskId: created.task.id,
        memberId: input.assigneeMemberId,
        dueDate: input.dueDateIso,
      });
    } else {
      await mobileApi.post("/api/assignments/auto-assign", {
        taskId: created.task.id,
        dueDate: input.dueDateIso,
      });
    }
    return;
  }

  await mobileApi.post("/api/shopping-list", {
    name: input.name,
    quantity: input.quantity,
    clientId: input.clientId,
  });
}

/**
 * Saves through a single queued mutation (pattern B, §7): online, it awaits
 * the save normally; offline, it queues the mutation and resolves `true`
 * immediately so the sheet can close and show "Anotado · Se envía cuando
 * vuelva la conexión" instead of waiting.
 *
 * A paused mutation never rejects — it waits for reconnect, so `onError` only
 * ever fires for a genuine failure (a real 4xx/5xx, or a network error whose
 * retries are exhausted). There is no optimistic UI to roll back here, but a
 * failure that arrives after the sheet already closed (because the save was
 * queued, or because the connection dropped mid-flight) must still reach the
 * user — it's reported through a standalone snackbar instead of the sheet's
 * inline error.
 */
export function useAnotarSave() {
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const snackbar = useSnackbar();

  const mutation = useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.anotarSave,
    mutationFn: performAnotarSaveMutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.my(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.shoppingList.list(),
      });
    },
  });

  function reportLateFailure(input: AnotarMutationInput, error: unknown): void {
    console.warn("Anotar: queued save failed", error);
    snackbar.show({
      text: "No se pudo guardar",
      tone: "error",
      actionLabel: "Reintentar",
      onAction: () => {
        mutation
          .mutateAsync(input)
          .catch((retryError: unknown) => reportLateFailure(input, retryError));
      },
    });
  }

  // mutateAsync, not mutate + per-call callbacks: those only fire for the latest
  // call on this observer, which would strand every item but the last one.
  // Resolves `true` (queued) when the save is queued up front or pauses
  // mid-flight; a failure after that point surfaces as a snackbar.
  function runQueuedSave(input: AnotarMutationInput): Promise<boolean> {
    const pending = mutation.mutateAsync(input);
    if (!isOnline) {
      pending.catch((error: unknown) => reportLateFailure(input, error));
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve, reject) => {
      let settled = false;
      const unsubscribe = onlineManager.subscribe((online) => {
        if (online || settled) return;
        settled = true;
        resolve(true);
      });

      pending.then(
        () => {
          unsubscribe();
          if (settled) return;
          settled = true;
          resolve(false);
        },
        (error: unknown) => {
          unsubscribe();
          if (settled) {
            reportLateFailure(input, error);
            return;
          }
          settled = true;
          reject(error);
        },
      );
    });
  }

  async function save(input: AnotarSaveInput): Promise<boolean> {
    if (input.kind !== "item") {
      return runQueuedSave(input);
    }
    // Each item is its own mutation: a paused first item must not block the
    // rest from being queued, and a resumed one never re-posts a saved item.
    const queuedFlags = await Promise.all(
      input.items.map((item) =>
        runQueuedSave({
          kind: "queued-item",
          name: item.name,
          quantity: item.quantity,
          clientId: createUniqueId(),
        }),
      ),
    );
    return queuedFlags.some(Boolean);
  }

  return { save, isSaving: mutation.isPending };
}
