import { createApiClient } from "@habita/api-client";

import { mobileConfig } from "./config";
import { clearMobileSession, getMobileSessionSnapshot, getOrCreateDeviceId, setMobileTokens } from "./storage";
import { trackMobileEvent } from "./telemetry";
import { emitRuntimeEvent } from "./runtime-events";

interface MobileRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshMobileTokens(): Promise<boolean> {
  const session = await getMobileSessionSnapshot();
  if (!session.refreshToken) {
    return false;
  }

  const deviceId = await getOrCreateDeviceId();

  try {
    const response = await fetch(`${mobileConfig.apiBaseUrl}/api/auth/mobile/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: session.refreshToken,
        deviceId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await clearMobileSession();
      }
      return false;
    }

    const payload = (await response.json()) as MobileRefreshResponse;
    if (!payload.accessToken || !payload.refreshToken) {
      return false;
    }

    await setMobileTokens(payload.accessToken, payload.refreshToken);
    trackMobileEvent("info", "Mobile tokens refreshed");
    return true;
  } catch (error) {
    trackMobileEvent("warn", "Failed to refresh mobile tokens", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

async function refreshMobileTokensWithLock(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshMobileTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ─── Proactive token refresh ────────────────────────────────────────────────
// Decode JWT exp claim (without a library) and refresh 2 minutes before expiry.

const REFRESH_BUFFER_MS = 2 * 60 * 1000;
const MIN_CHECK_INTERVAL_MS = 30 * 1000;
const MAX_CHECK_INTERVAL_MS = 5 * 60 * 1000;

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProactiveRefresh(): void {
  clearProactiveRefresh();

  const run = async () => {
    const session = await getMobileSessionSnapshot();
    if (!session.accessToken) return;

    const exp = decodeJwtExp(session.accessToken);
    if (!exp) {
      // Can't determine expiry — check again later
      proactiveTimer = setTimeout(run, MAX_CHECK_INTERVAL_MS);
      return;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const timeUntilExpiryMs = (exp - nowSec) * 1000;

    if (timeUntilExpiryMs <= REFRESH_BUFFER_MS) {
      // Token is near expiry or already expired — refresh now
      const refreshed = await refreshMobileTokensWithLock();
      if (refreshed) {
        // Re-schedule with new token
        proactiveTimer = setTimeout(run, MIN_CHECK_INTERVAL_MS);
      }
      // If refresh failed, reactive handler (onAuthFailure) will take over
      return;
    }

    // Schedule refresh for REFRESH_BUFFER_MS before expiry
    const delayMs = Math.max(MIN_CHECK_INTERVAL_MS, timeUntilExpiryMs - REFRESH_BUFFER_MS);
    proactiveTimer = setTimeout(run, Math.min(delayMs, MAX_CHECK_INTERVAL_MS));
  };

  // Initial check after a short delay
  proactiveTimer = setTimeout(() => void run(), MIN_CHECK_INTERVAL_MS);
}

function clearProactiveRefresh(): void {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

export { scheduleProactiveRefresh, clearProactiveRefresh };

// ─── API client ─────────────────────────────────────────────────────────────

export const mobileApi = createApiClient({
  baseUrl: mobileConfig.apiBaseUrl,
  networkRetries: 2,
  networkRetryDelayMs: 350,
  networkErrorMessage: "Sin conexion. Revisa internet e intenta nuevamente.",
  getAuth: async () => {
    const session = await getMobileSessionSnapshot();
    return {
      accessToken: session.accessToken,
      householdId: session.householdId,
    };
  },
  onAuthFailure: async () => {
    trackMobileEvent("warn", "Authentication failed in mobile API client");
    return refreshMobileTokensWithLock();
  },
  onUnauthorized: async () => {
    await clearMobileSession();
    emitRuntimeEvent({
      type: "auth-expired",
      message: "Tu sesion expiro. Volve a iniciar sesion.",
    });
  },
  onNetworkError: async (error) => {
    emitRuntimeEvent({
      type: "network-error",
      message: error.message || "Sin conexion. Revisa internet e intenta nuevamente.",
    });
  },
});
