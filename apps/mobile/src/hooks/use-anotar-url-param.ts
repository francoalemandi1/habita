import { useEffect } from "react";
import { router, useGlobalSearchParams } from "expo-router";
import { openAnotar } from "@/lib/anotar-store";

type AnotarKind = "expense" | "task" | "item";

const ANOTAR_KINDS: readonly AnotarKind[] = ["expense", "task", "item"];

function toAnotarKind(value: string | null | undefined): AnotarKind | null {
  return ANOTAR_KINDS.find((kind) => kind === value) ?? null;
}

/**
 * Legacy deep-link support for `/(app)/new-expense`, `/(app)/new-task`
 * (handoff §5.1): those now alias to `?anotar=<kind>` on the place they
 * belong to. Reads the param once from anywhere in the app — `useGlobalSearchParams`
 * sees it regardless of which tab is focused — opens Anotar on that kind's
 * classic form, and strips it so going back doesn't reopen the sheet.
 */
export function useAnotarUrlParam(): void {
  const { anotar } = useGlobalSearchParams<{ anotar?: string }>();

  useEffect(() => {
    const validKind = toAnotarKind(anotar);
    if (!validKind) return;
    openAnotar({ kind: validKind });
    router.setParams({ anotar: "" });
  }, [anotar]);
}
