"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { onlineManager } from "@tanstack/react-query";
import { APP_ROUTES } from "@habita/contracts";
import { useSnackbar } from "@/components/ds/snackbar";
import { useIsOnline } from "@/hooks/use-is-online";
import { useFund } from "@/hooks/use-fund";
import { useAnotarSaveExpense, useAnotarSaveItems, useAnotarSaveTask } from "@/hooks/use-anotar-save";
import { resolveAnotarSaveKind } from "@/components/features/anotar/anotar-draft-types";
import { isFundToggleVisible, resolveChargeToFund } from "@/lib/anotar-expense-logic";

import type { ClassicKind } from "@/components/features/anotar/anotar-classic-form";
import type { AnotarMode } from "@/hooks/use-anotar-draft-state";
import type { ExpenseDraft, ItemDraft, TaskDraft } from "@/components/features/anotar/anotar-draft-types";

interface UseAnotarSubmitParams {
  mode: AnotarMode;
  classicKind: ClassicKind;
  expenseDraft: ExpenseDraft;
  taskDraft: TaskDraft;
  itemDrafts: ItemDraft[];
  /** Closes the sheet and clears its draft state \u2014 called on a real success and on an offline-queued save. */
  closeAndReset: () => void;
}

/**
 * Owns the Anotar submit flow: resolves what's being saved, queues it
 * immediately when offline, and \u2014 for a save that starts online but loses
 * connection mid-flight \u2014 closes as queued instead of spinning forever
 * (handoff \u00a77 "Sin conexi\u00f3n"; a paused mutation never rejects on its own).
 */
export function useAnotarSubmit({
  mode,
  classicKind,
  expenseDraft,
  taskDraft,
  itemDrafts,
  closeAndReset,
}: UseAnotarSubmitParams) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();
  const snackbar = useSnackbar();
  const isOnline = useIsOnline();
  const { data: fund } = useFund();
  const saveExpense = useAnotarSaveExpense();
  const saveTask = useAnotarSaveTask();
  const { saveItems, isPending: itemsPending } = useAnotarSaveItems();

  const resolvedKind = resolveAnotarSaveKind(mode, classicKind);

  async function handleSave(): Promise<void> {
    setSaveError(null);
    if (!resolvedKind) return;

    if (resolvedKind === "expense" && !expenseDraft.payerId) {
      setSaveError("Todav\u00eda no sabemos qui\u00e9n sos en el hogar \u2014 reintent\u00e1 en un segundo");
      return;
    }

    // Generated once per save, not inside the mutation, so a react-query retry
    // (offlineMutationRetry) replays the same key instead of creating a duplicate.
    const idempotencyKey = crypto.randomUUID();

    const resultPromise =
      resolvedKind === "expense"
        ? saveExpense.mutateAsync({
            title: expenseDraft.title,
            amount: expenseDraft.amount,
            category: expenseDraft.category,
            paidById: expenseDraft.payerId,
            participantIds: expenseDraft.participantIds,
            date: expenseDraft.date,
            splitType: expenseDraft.splitType,
            customSplits: expenseDraft.customSplits,
            chargeToFund: resolveChargeToFund(expenseDraft.chargeToFund, isFundToggleVisible(fund, expenseDraft.category)),
            notes: expenseDraft.notes,
            idempotencyKey,
          })
        : resolvedKind === "task"
          ? saveTask.mutateAsync({
              name: taskDraft.name,
              frequency: taskDraft.frequency,
              assigneeId: taskDraft.assigneeId,
              dueDate: taskDraft.dueDate,
              description: taskDraft.description,
              weight: taskDraft.weight,
              isRotating: taskDraft.isRotating,
              idempotencyKey,
            })
          : saveItems(itemDrafts.filter((item) => item.name.trim().length > 0));

    function closeQueuedOffline(): void {
      closeAndReset();
      snackbar.show({ text: "Anotado \u00b7 Se env\u00eda cuando vuelva la conexi\u00f3n" });
    }

    if (!isOnline) {
      void resultPromise.catch((error: unknown) => {
        console.warn("Anotar: el guardado en cola fall\u00f3", error);
        snackbar.show({ text: "No se pudo guardar", tone: "error" });
      });
      closeQueuedOffline();
      return;
    }

    // A connection drop mid-save pauses the mutation: close as queued instead of spinning,
    // and keep the late result from touching a draft the user may have started since.
    let wasQueued = false;
    const unsubscribe = onlineManager.subscribe((online) => {
      if (online || wasQueued) return;
      wasQueued = true;
      closeQueuedOffline();
    });
    try {
      await resultPromise;
      router.refresh();
      if (wasQueued) return;
      const successCopy = {
        expense: { text: "Gasto anotado", route: APP_ROUTES.plata },
        task: { text: "Tarea anotada", route: APP_ROUTES.tareas },
        item: { text: "Sumado a la lista", route: APP_ROUTES.super },
      }[resolvedKind];
      snackbar.show({ text: successCopy.text, actionKind: "navigate", onAction: () => router.push(successCopy.route) });
      closeAndReset();
    } catch (error) {
      console.warn("Anotar: save failed", error);
      if (wasQueued) {
        snackbar.show({ text: "No se pudo guardar", tone: "error" });
        return;
      }
      const errorText = {
        expense: "No se pudo anotar el gasto",
        task: "No se pudo anotar la tarea",
        item: "No se pudo sumar a la lista",
      }[resolvedKind];
      setSaveError(errorText);
    } finally {
      unsubscribe();
    }
  }

  return {
    resolvedKind,
    saveError,
    isSaving: saveExpense.isPending || saveTask.isPending || itemsPending,
    handleSave,
  };
}
