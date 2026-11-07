import { useSyncExternalStore } from "react";
import type { ExpenseCategory } from "@habita/contracts";

export interface AnotarPrefill {
  text?: string;
  kind?: "expense" | "task" | "item";
  expense?: { title?: string; amount?: number; category?: ExpenseCategory };
}

export interface AnotarStoreState {
  visible: boolean;
  prefill: AnotarPrefill | null;
  /** Bumped on every open — used as a React key so each session starts with fresh state. */
  sessionId: number;
}

let sessionCounter = 0;
let state: AnotarStoreState = { visible: false, prefill: null, sessionId: sessionCounter };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Opens the Anotar sheet, optionally prefilled (e.g. from a detected invoice). */
export function openAnotar(prefill?: AnotarPrefill): void {
  sessionCounter += 1;
  state = { visible: true, prefill: prefill ?? null, sessionId: sessionCounter };
  emit();
}

export function closeAnotar(): void {
  state = { ...state, visible: false };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AnotarStoreState {
  return state;
}

/** §5.3 Global "Anotar" — single source of truth for the sheet's visibility and prefill. */
export function useAnotarStore(): AnotarStoreState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
