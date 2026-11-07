"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { openAnotar } from "@/components/features/anotar/anotar-events";

type AnotarKind = "expense" | "task" | "item";

const ANOTAR_KINDS: readonly AnotarKind[] = ["expense", "task", "item"];

function toAnotarKind(value: string | null | undefined): AnotarKind | null {
  return ANOTAR_KINDS.find((kind) => kind === value) ?? null;
}

/**
 * Legacy-URL support for `/new-expense`, `/new-task` (handoff §5.2): those now
 * alias to `?anotar=<kind>` on the place they belong to. Reads the param once,
 * opens Anotar on that kind's classic form, and strips it so a refresh or back
 * doesn't reopen the sheet.
 */
export function useAnotarUrlParam(): void {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const kind = searchParams.get("anotar");

  useEffect(() => {
    const validKind = toAnotarKind(kind);
    if (!validKind) return;
    openAnotar({ kind: validKind });

    const next = new URLSearchParams(searchParams);
    next.delete("anotar");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [kind, pathname, router, searchParams]);
}
