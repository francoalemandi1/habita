"use client";

import { useState } from "react";
import { shouldFallbackToClassic } from "@/lib/anotar-ai-error";
import {
  buildExpenseDraftFromParsed,
  buildItemDraftsFromParsed,
  buildTaskDraftFromParsed,
  defaultExpenseDraft,
  defaultItemDrafts,
  defaultTaskDraft,
} from "@/components/features/anotar/anotar-draft-types";

import type { ParseEntryResponse } from "@habita/contracts";
import type { AnotarAiOutcome } from "@/lib/anotar-ai-error";
import type { ExpenseDraft, ItemDraft, TaskDraft } from "@/components/features/anotar/anotar-draft-types";
import type { ClassicKind } from "@/components/features/anotar/anotar-classic-form";
import type { AnotarOpenDetail } from "@/components/features/anotar/anotar-events";
import type { MemberSummary } from "@habita/contracts";

export type AnotarMode = "idle" | "expense" | "task" | "item" | "unknown" | "classic";

interface UseAnotarDraftStateParams {
  text: string;
  members: MemberSummary[];
  currentMemberId: string | null;
}

/**
 * Owns the sheet's mode + per-kind drafts. Drafts are set event-driven from
 * `applyParseResult`/`applyParseError` (invoked by useAnotarParse's callbacks
 * when the latest request settles) — never derived in an effect from parse state.
 */
export function useAnotarDraftState({ text, members, currentMemberId }: UseAnotarDraftStateParams) {
  const [mode, setMode] = useState<AnotarMode>("idle");
  const [classicKind, setClassicKind] = useState<ClassicKind>("expense");
  const [rateLimited, setRateLimited] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(() => defaultExpenseDraft(members, currentMemberId ?? ""));
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(() => defaultTaskDraft());
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>(() => defaultItemDrafts());

  function applyParseResult(result: ParseEntryResponse): void {
    setRateLimited(false);
    setAiUnavailable(false);

    if (result.kind === "expense") {
      setExpenseDraft(buildExpenseDraftFromParsed(result.expense, members, currentMemberId ?? ""));
      setMode("expense");
    } else if (result.kind === "task") {
      setTaskDraft(buildTaskDraftFromParsed(result.task));
      setMode("task");
    } else if (result.kind === "item") {
      setItemDrafts(buildItemDraftsFromParsed(result.items));
      setMode("item");
    } else {
      setMode("unknown");
    }
  }

  function applyParseError(outcome: AnotarAiOutcome): void {
    if (!shouldFallbackToClassic(outcome)) {
      setRateLimited(true);
      return;
    }
    setRateLimited(false);
    setAiUnavailable(true);
    setExpenseDraft((current) => ({ ...current, title: current.title || text }));
    setMode("classic");
  }

  function resetAll(): void {
    setMode("idle");
    setRateLimited(false);
    setAiUnavailable(false);
    setExpenseDraft(defaultExpenseDraft(members, currentMemberId ?? ""));
    setTaskDraft(defaultTaskDraft());
    setItemDrafts(defaultItemDrafts());
  }

  function applyPrefill(detail: AnotarOpenDetail | null): void {
    if (!detail) return;
    if (detail.kind === "expense" || detail.expense) {
      setExpenseDraft({
        ...defaultExpenseDraft(members, currentMemberId ?? ""),
        title: detail.expense?.title ?? detail.text ?? "",
        amount: detail.expense?.amount ?? 0,
        category: detail.expense?.category ?? "OTHER",
      });
      setClassicKind("expense");
      setMode("classic");
      return;
    }
    if (detail.kind === "task") {
      setTaskDraft(defaultTaskDraft(detail.text ?? ""));
      setClassicKind("task");
      setMode("classic");
      return;
    }
    if (detail.kind === "item") {
      setItemDrafts(defaultItemDrafts(detail.text ?? ""));
      setClassicKind("item");
      setMode("classic");
    }
  }

  function handleUnknownPick(kind: ClassicKind): void {
    setAiUnavailable(false);
    setClassicKind(kind);
    if (kind === "expense") setExpenseDraft((current) => ({ ...current, title: text }));
    if (kind === "task") setTaskDraft((current) => ({ ...current, name: text }));
    if (kind === "item") setItemDrafts([{ name: text, quantity: 1 }]);
    setMode("classic");
  }

  return {
    mode,
    classicKind,
    setClassicKind,
    rateLimited,
    aiUnavailable,
    expenseDraft,
    setExpenseDraft,
    taskDraft,
    setTaskDraft,
    itemDrafts,
    setItemDrafts,
    applyParseResult,
    applyParseError,
    resetAll,
    applyPrefill,
    handleUnknownPick,
  };
}
