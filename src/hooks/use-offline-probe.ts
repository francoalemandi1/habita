"use client";

import { useEffect } from "react";
import { onlineManager } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { nextProbeDelayMs } from "@/lib/offline-network";

/**
 * While offline, probes GET /api/health with backoff and flips the app back
 * online on a 200. No polling while already online; window focus / the tab
 * becoming visible triggers an immediate probe (handoff §7 "Sin conexión").
 */
export function useOfflineProbe(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let cancelled = false;

    function clearTimer(): void {
      if (timer) clearTimeout(timer);
      timer = null;
    }

    function scheduleProbe(): void {
      clearTimer();
      timer = setTimeout(() => void probe(), nextProbeDelayMs(attempt));
    }

    async function probe(): Promise<void> {
      try {
        await apiFetch("/api/health");
        if (!cancelled) onlineManager.setOnline(true);
      } catch {
        if (cancelled || onlineManager.isOnline()) return;
        attempt += 1;
        scheduleProbe();
      }
    }

    function probeIfOffline(): void {
      if (!onlineManager.isOnline()) void probe();
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") probeIfOffline();
    }

    const unsubscribe = onlineManager.subscribe(() => {
      attempt = 0;
      if (onlineManager.isOnline()) {
        clearTimer();
      } else {
        scheduleProbe();
      }
    });

    if (!onlineManager.isOnline()) scheduleProbe();

    window.addEventListener("focus", probeIfOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearTimer();
      unsubscribe();
      window.removeEventListener("focus", probeIfOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
