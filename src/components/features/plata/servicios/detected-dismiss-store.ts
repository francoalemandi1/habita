"use client";

const STORAGE_KEY = "habita_dismissed_detected_services";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch (error) {
    console.warn("detected-dismiss-store: could not read dismissed services", error);
    return new Set();
  }
}

/**
 * "No es mía" has no dismiss endpoint (§11, no backend changes) — remembered
 * client-side only, so the detected invoice reappears after a future scan on
 * another device or once localStorage is cleared.
 */
export function isDismissedDetectedService(key: string): boolean {
  return readDismissed().has(key);
}

export function dismissDetectedService(key: string): void {
  if (typeof window === "undefined") return;
  const dismissed = readDismissed();
  dismissed.add(key);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch (error) {
    console.warn("dismissDetectedService: could not persist dismissal", error);
  }
}
