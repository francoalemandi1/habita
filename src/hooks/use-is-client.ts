"use client";

import { useSyncExternalStore } from "react";

function subscribeNever(): () => void {
  return () => undefined;
}

/**
 * False during SSR and the hydration render, true afterwards. Use it to gate
 * values only the browser knows (theme from localStorage) without a hydration mismatch.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}
