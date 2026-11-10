"use client";

import { useSearchParams } from "next/navigation";

/**
 * Segmented view state kept in `?v=` (handoff §5.1). Switching updates the URL with the
 * native History API, which Next keeps in sync with `useSearchParams` without a server
 * round trip — so the segment and its content change on the same frame as the tap.
 */
export function useSegmentView<T extends string>(views: readonly T[], fallback: T): [T, (next: T) => void] {
  const searchParams = useSearchParams();
  const requested = searchParams.get("v");
  const view = views.find((candidate) => candidate === requested) ?? fallback;

  function setView(next: T): void {
    if (next === view) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === fallback) {
      params.delete("v");
    } else {
      params.set("v", next);
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  return [view, setView];
}
