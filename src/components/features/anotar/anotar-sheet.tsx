"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ds/sheet";
import { Composer } from "@/components/ds/composer";
import { shouldOpenAnotarFromKeydown } from "./anotar-shortcut";
import { ANOTAR_OPEN_EVENT, readAnotarOpenDetail } from "./anotar-events";
import { useAnotarParse } from "@/hooks/use-anotar-parse";
import { useAnotarHousehold } from "@/hooks/use-anotar-household";
import { useAnotarDraftState } from "@/hooks/use-anotar-draft-state";
import { useAnotarSubmit } from "@/hooks/use-anotar-submit";
import { useAnotarUrlParam } from "@/hooks/use-anotar-url-param";
import { AnotarExpensePreview } from "./anotar-expense-preview";
import { AnotarTaskPreview } from "./anotar-task-preview";
import { AnotarItemPreview } from "./anotar-item-preview";
import { AnotarUnknownCard } from "./anotar-unknown-card";
import { AnotarClassicForm } from "./anotar-classic-form";
import { AnotarSaveButton } from "./anotar-save-button";
import { AnotarHouseholdError } from "./anotar-household-error";
import { ANOTAR_CTA_LABELS as CTA_LABELS, ANOTAR_PARSE_DEBOUNCE_MS as DEBOUNCE_MS } from "./anotar-draft-types";

export function AnotarSheet(): React.JSX.Element {
  useAnotarUrlParam();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const { members, currentMemberId, isError: householdError, retry: retryHousehold } = useAnotarHousehold();
  const draft = useAnotarDraftState({ text, members, currentMemberId });
  const { state: parseState, parse, reset: resetParse } = useAnotarParse({
    onResult: draft.applyParseResult,
    onError: draft.applyParseError,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetAll(): void {
    setText("");
    resetParse();
    draft.resetAll();
  }

  const submit = useAnotarSubmit({
    mode: draft.mode,
    classicKind: draft.classicKind,
    expenseDraft: draft.expenseDraft,
    taskDraft: draft.taskDraft,
    itemDrafts: draft.itemDrafts,
    closeAndReset: () => {
      setOpen(false);
      resetAll();
    },
  });

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

  const cta = submit.resolvedKind ? CTA_LABELS[submit.resolvedKind] : null;
  const ctaDisabled = submit.resolvedKind === "expense" && !currentMemberId;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} title="Anotar">
      <div className="flex flex-col gap-4">
        {householdError ? (
          <AnotarHouseholdError onRetry={retryHousehold} />
        ) : (
          <>
            <Composer value={text} onChange={setText} onSubmit={() => parse(text)} autoFocus />

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

            {cta && parseState.status !== "loading" && (
              <AnotarSaveButton
                label={cta.label}
                savingLabel={cta.saving}
                isSaving={submit.isSaving}
                disabled={ctaDisabled}
                error={submit.saveError}
                onClick={() => void submit.handleSave()}
              />
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
