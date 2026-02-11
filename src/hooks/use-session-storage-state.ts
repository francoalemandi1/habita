"use client";

import { useState, useCallback, useRef } from "react";

/**
 * useState backed by sessionStorage — survives client-side navigation
 * but clears when the browser tab is closed.
 *
 * Degrades silently if sessionStorage is unavailable (private browsing, quota exceeded).
 * Safe for dynamic keys: re-reads from sessionStorage when key changes.
 */
export function useSessionStorageState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const keyRef = useRef(key);

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Re-read from sessionStorage when key changes
  if (keyRef.current !== key) {
    keyRef.current = key;
    try {
      const item = sessionStorage.getItem(key);
      const parsed = item ? (JSON.parse(item) as T) : initialValue;
      setStoredValue(parsed);
    } catch {
      setStoredValue(initialValue);
    }
  }

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          sessionStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // sessionStorage full or unavailable — degrade gracefully
        }
        return nextValue;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
