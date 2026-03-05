"use client";

import { useCallback, useEffect, useState } from "react";

const KEY_PREFIX = "habita:milestone:";

export type MilestoneKey =
  | "first-expense"
  | "first-search"
  | "first-recipe"
  | "first-event-saved"
  | "first-invite-sent";

export function useMilestone(key: MilestoneKey) {
  const storageKey = `${KEY_PREFIX}${key}`;
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setIsCompleted(localStorage.getItem(storageKey) === "1");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [storageKey]);

  const complete = useCallback(() => {
    if (localStorage.getItem(storageKey) === "1") return false;
    localStorage.setItem(storageKey, "1");
    setIsCompleted(true);
    return true; // was the first time
  }, [storageKey]);

  return { isCompleted, complete };
}
