"use client";

import { useState, useCallback } from "react";

const KEY_PREFIX = "habita:first-visit:";

function readFirstVisit(section: string): boolean {
  if (typeof window === "undefined") return false;
  const key = `${KEY_PREFIX}${section}`;
  return localStorage.getItem(key) === null;
}

export function useFirstVisit(section: string): {
  isFirstVisit: boolean;
  dismiss: () => void;
} {
  const [isFirstVisit, setIsFirstVisit] = useState(() => readFirstVisit(section));

  const dismiss = useCallback(() => {
    setIsFirstVisit(false);
    localStorage.setItem(`${KEY_PREFIX}${section}`, "dismissed");
  }, [section]);

  return { isFirstVisit, dismiss };
}

/** Clear all first-visit keys so guides show again */
export function resetAllGuides(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
