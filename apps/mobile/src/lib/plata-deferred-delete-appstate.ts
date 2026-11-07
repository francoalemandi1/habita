/**
 * Wires `flushPendingDeletes` (handoff §7) to app backgrounding. Kept out of
 * `deferred-delete.ts` so that pure module stays free of React Native
 * imports and importable under plain Node test runners.
 */
import { AppState } from "react-native";
import { flushPendingDeletes } from "./deferred-delete";

/** Call once from a mounted screen; returns the cleanup for its effect. */
export function registerDeferredDeleteAppStateFlush(): () => void {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "background") flushPendingDeletes();
  });
  return () => subscription.remove();
}
