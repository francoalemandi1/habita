import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void): () => void {
  return onlineManager.subscribe(onStoreChange);
}

function getIsOnline(): boolean {
  return onlineManager.isOnline();
}

// Server render and first paint assume online, so nothing flashes "Sin conexión" on load.
function getServerIsOnline(): boolean {
  return true;
}

/**
 * React Query's onlineManager as a hook: the one source of truth for the offline
 * banner, queued-change dots and "Necesitás conexión" on C/D actions (§7).
 */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, getIsOnline, getServerIsOnline);
}
