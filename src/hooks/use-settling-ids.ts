"use client";

import { useEffect, useRef, useState } from "react";
import { withViewTransition } from "@/lib/view-transition";

function without(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(ids);
  next.delete(id);
  return next;
}

/**
 * Keeps ids "settling" for `delayMs` after `settle(id)`, then releases them inside a
 * View Transition. Lets a just-checked row stay in place long enough to see the check
 * before it moves to its new section.
 */
export function useSettlingIds(delayMs: number) {
  const [settlingIds, setSettlingIds] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const pendingTimers = timers.current;
    return () => {
      for (const timer of pendingTimers.values()) window.clearTimeout(timer);
    };
  }, []);

  function settle(id: string): void {
    window.clearTimeout(timers.current.get(id));
    setSettlingIds((current) => new Set(current).add(id));
    const timer = window.setTimeout(() => {
      timers.current.delete(id);
      withViewTransition(() => setSettlingIds((current) => without(current, id)));
    }, delayMs);
    timers.current.set(id, timer);
  }

  function cancel(id: string): void {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setSettlingIds((current) => without(current, id));
  }

  return { settlingIds, settle, cancel };
}
