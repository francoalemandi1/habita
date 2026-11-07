import { onlineManager } from "@tanstack/react-query";
import { AppState } from "react-native";

import { mobileConfig } from "./config";
import { nextProbeDelayMs } from "./offline-network";

import type { AppStateStatus } from "react-native";

export { isNetworkError, nextProbeDelayMs } from "./offline-network";

let setOnlineRef: ((online: boolean) => void) | null = null;
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let probeAttempt = 0;

function clearProbeTimer(): void {
  if (probeTimer) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
}

function scheduleNextProbe(): void {
  clearProbeTimer();
  const delay = nextProbeDelayMs(probeAttempt);
  probeAttempt += 1;
  probeTimer = setTimeout(() => void probeOnce(), delay);
}

async function probeOnce(): Promise<void> {
  try {
    const response = await fetch(`${mobileConfig.apiBaseUrl}/api/health`);
    if (response.ok) {
      probeAttempt = 0;
      clearProbeTimer();
      setOnlineRef?.(true);
      return;
    }
  } catch (error) {
    // Still unreachable: log once per attempt and fall through to reschedule.
    console.warn("Offline probe: /api/health unreachable", error);
  }
  scheduleNextProbe();
}

/** Called from the mobile API client whenever a request fails with a real network error. */
export function reportNetworkError(): void {
  if (onlineManager.isOnline()) {
    setOnlineRef?.(false);
  }
  if (!probeTimer) {
    probeAttempt = 0;
    scheduleNextProbe();
  }
}

function handleAppStateChange(state: AppStateStatus): void {
  if (state === "active" && !onlineManager.isOnline()) {
    probeAttempt = 0;
    void probeOnce();
  }
}

/**
 * Feeds React Query's `onlineManager` from our own signals instead of the
 * (unreliable on Expo/Hermes) default NetInfo-less heuristic: network errors
 * reported by the API client, a backoff probe of `/api/health`, and an
 * immediate probe when the app comes back to the foreground while offline.
 */
export function setupOfflineDetector(): void {
  onlineManager.setEventListener((setOnline) => {
    setOnlineRef = setOnline;
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
      clearProbeTimer();
      setOnlineRef = null;
    };
  });
}
