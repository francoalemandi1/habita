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
    trackMobileEvent("info", "Mobile tokens refreshed after auth failure");
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
