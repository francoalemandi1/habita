import { createApiClient } from "@habita/api-client";

import { mobileConfig } from "./config";
import {
  clearMobileSession,
  getMobileSessionSnapshot,
  getOrCreateDeviceId,
  getTokenExpiresAt,
  setMobileTokens,
} from "./storage";
import { trackMobileEvent } from "./telemetry";
import { emitRuntimeEvent } from "./runtime-events";

interface MobileRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
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

    await setMobileTokens(payload.accessToken, payload.refreshToken, payload.expiresInSeconds);
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
// Read stored expiresAt timestamp and refresh 5 minutes before expiry.

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProactiveRefresh(): void {
  clearProactiveRefresh();

  const run = async () => {
    const expiresAt = await getTokenExpiresAt();
    if (!expiresAt) return; // no expiry info stored

    const timeUntilExpiry = expiresAt - Date.now();

    if (timeUntilExpiry <= REFRESH_BUFFER_MS) {
      // Token is near expiry or already expired — refresh now
      const refreshed = await refreshMobileTokensWithLock();
      if (refreshed) {
        // New tokens stored with new expiresAt — re-check in 1 min
        proactiveTimer = setTimeout(run, 60_000);
      }
      // If refresh failed, reactive handler (onAuthFailure) will take over
      return;
    }

    // Schedule refresh for BUFFER before expiry
    const delayMs = timeUntilExpiry - REFRESH_BUFFER_MS;
    proactiveTimer = setTimeout(run, delayMs);
  };

  // Initial check after 10s (let hydration complete first)
  proactiveTimer = setTimeout(() => void run(), 10_000);
}

function clearProactiveRefresh(): void {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

export { scheduleProactiveRefresh, clearProactiveRefresh };

// ─── Auth-expired deduplication ─────────────────────────────────────────────

let authExpiredEmitted = false;

export function resetAuthExpiredFlag(): void {
  authExpiredEmitted = false;
}

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
    if (authExpiredEmitted) return;
    authExpiredEmitted = true;
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
