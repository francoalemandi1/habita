"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ds/sheet";
import { Composer } from "@/components/ds/composer";
import { useSnackbar } from "@/components/ds/snackbar";
import { APP_ROUTES } from "@habita/contracts";
import { shouldOpenAnotarFromKeydown } from "./anotar-shortcut";
import { ANOTAR_OPEN_EVENT, readAnotarOpenDetail } from "./anotar-events";
import { useAnotarParse } from "@/hooks/use-anotar-parse";
import { useAnotarHousehold } from "@/hooks/use-anotar-household";
import { useAnotarDraftState } from "@/hooks/use-anotar-draft-state";
import { useAnotarSaveExpense, useAnotarSaveItems, useAnotarSaveTask } from "@/hooks/use-anotar-save";
import { AnotarExpensePreview } from "./anotar-expense-preview";
import { AnotarTaskPreview } from "./anotar-task-preview";
import { AnotarItemPreview } from "./anotar-item-preview";
import { AnotarUnknownCard } from "./anotar-unknown-card";
import { AnotarClassicForm } from "./anotar-classic-form";
import { AnotarSaveButton } from "./anotar-save-button";
import { AnotarHouseholdError } from "./anotar-household-error";
import { ANOTAR_CTA_LABELS as CTA_LABELS, ANOTAR_PARSE_DEBOUNCE_MS as DEBOUNCE_MS } from "./anotar-draft-types";

export function AnotarSheet(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const router = useRouter();
  const snackbar = useSnackbar();
  const { members, currentMemberId, isError: householdError, retry: retryHousehold } = useAnotarHousehold();
  const draft = useAnotarDraftState({ text, members, currentMemberId });
  const { state: parseState, parse, reset: resetParse } = useAnotarParse({
    onResult: draft.applyParseResult,
    onError: draft.applyParseError,
  });
  const saveExpense = useAnotarSaveExpense();
  const saveTask = useAnotarSaveTask();
  const { saveItems, isPending: itemsPending } = useAnotarSaveItems();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetAll(): void {
    setText("");
    setSaveError(null);
    resetParse();
    draft.resetAll();
  }

  // The open/keydown listeners below are attached once; this ref keeps them
  // calling the latest resetAll/applyPrefill instead of a stale mount-time closure.
  const latestRef = useRef({ resetAll, applyPrefill: draft.applyPrefill });
  useEffect(() => {
    latestRef.current = { resetAll, applyPrefill: draft.applyPrefill };
  });

  useEffect(() => {
    function handleOpenEvent(event: Event): void {
      latestRef.current.resetAll();
      setOpen(true);
      latestRef.current.applyPrefill(readAnotarOpenDetail(event));
    }
    function handleKeydown(event: KeyboardEvent): void {
      const target = event.target;
      const shouldOpen = shouldOpenAnotarFromKeydown({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        target: target instanceof HTMLElement ? { tagName: target.tagName, isContentEditable: target.isContentEditable } : null,
      });
      if (!shouldOpen) return;
      event.preventDefault();
      latestRef.current.resetAll();
      setOpen(true);
    }
    window.addEventListener(ANOTAR_OPEN_EVENT, handleOpenEvent);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener(ANOTAR_OPEN_EVENT, handleOpenEvent);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) return;
    debounceRef.current = setTimeout(() => parse(text), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, open, parse]);

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) resetAll();
  }

  async function handleSave(): Promise<void> {
    setSaveError(null);
    const kind = draft.mode === "classic" ? draft.classicKind : (draft.mode as "expense" | "task" | "item");

    if (kind === "expense" && !draft.expenseDraft.payerId) {
      setSaveError("Todavía no sabemos quién sos en el hogar — reintentá en un segundo");
      return;
    }

    try {
      if (kind === "expense") {
        await saveExpense.mutateAsync({
          title: draft.expenseDraft.title,
          amount: draft.expenseDraft.amount,
          category: draft.expenseDraft.category,
          paidById: draft.expenseDraft.payerId,
          participantIds: draft.expenseDraft.participantIds,
          date: draft.expenseDraft.date,
        });
        snackbar.show({ text: "Gasto anotado", actionKind: "navigate", onAction: () => router.push(APP_ROUTES.plata) });
      } else if (kind === "task") {
        await saveTask.mutateAsync({
          name: draft.taskDraft.name,
          frequency: draft.taskDraft.frequency,
          assigneeId: draft.taskDraft.assigneeId,
          dueDate: draft.taskDraft.dueDate,
        });
        snackbar.show({ text: "Tarea anotada", actionKind: "navigate", onAction: () => router.push(APP_ROUTES.tareas) });
      } else {
        await saveItems(draft.itemDrafts.filter((item) => item.name.trim().length > 0));
        snackbar.show({ text: "Sumado a la lista", actionKind: "navigate", onAction: () => router.push(APP_ROUTES.super) });
      }
      router.refresh();
      setOpen(false);
      resetAll();
    } catch {
      const errorText = { expense: "No se pudo anotar el gasto", task: "No se pudo anotar la tarea", item: "No se pudo sumar a la lista" }[kind];
      setSaveError(errorText);
    }
  }

  const isSaving = saveExpense.isPending || saveTask.isPending || itemsPending;
  const ctaKind = draft.mode === "classic" ? draft.classicKind : (draft.mode as "expense" | "task" | "item");
  const cta = CTA_LABELS[ctaKind] ?? CTA_LABELS.expense;
  const ctaDisabled = ctaKind === "expense" && !currentMemberId;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} title="Anotar">
      <div className="flex flex-col gap-4">
        {householdError ? (
          <AnotarHouseholdError onRetry={retryHousehold} />
        ) : (
          <>
            <Composer value={text} onChange={setText} onSubmit={() => parse(text)} />

            {draft.rateLimited && <p className="text-[13px] text-ink-3">Esperá un momento para seguir interpretando</p>}

            {draft.mode === "expense" && (
              <AnotarExpensePreview draft={draft.expenseDraft} onChange={draft.setExpenseDraft} members={members} currentMemberId={currentMemberId ?? ""} />
            )}
            {draft.mode === "task" && <AnotarTaskPreview draft={draft.taskDraft} onChange={draft.setTaskDraft} members={members} />}
            {draft.mode === "item" && <AnotarItemPreview drafts={draft.itemDrafts} onChange={draft.setItemDrafts} />}
            {draft.mode === "unknown" && <AnotarUnknownCard onPickKind={draft.handleUnknownPick} />}
            {draft.mode === "classic" && (
              <AnotarClassicForm
                kind={draft.classicKind}
                onKindChange={draft.setClassicKind}
                expenseDraft={draft.expenseDraft}
                onExpenseChange={draft.setExpenseDraft}
                taskDraft={draft.taskDraft}
                onTaskChange={draft.setTaskDraft}
                itemDrafts={draft.itemDrafts}
                onItemsChange={draft.setItemDrafts}
                members={members}
                currentMemberId={currentMemberId ?? ""}
                showAiUnavailableHint={draft.aiUnavailable}
              />
            )}

            {draft.mode !== "idle" && draft.mode !== "unknown" && parseState.status !== "loading" && (
              <AnotarSaveButton
                label={cta.label}
                savingLabel={cta.saving}
                isSaving={isSaving}
                disabled={ctaDisabled}
                error={saveError}
                onClick={() => void handleSave()}
              />
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
