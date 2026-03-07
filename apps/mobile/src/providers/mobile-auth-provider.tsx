import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "@habita/api-client";
import { mobileApi, scheduleProactiveRefresh, clearProactiveRefresh, resetAuthExpiredFlag } from "@/lib/api";
import {
  clearMobileSession,
  getMobileSessionSnapshot,
  getOrCreateDeviceId,
  setActiveHousehold,
  setMobileTokens,
} from "@/lib/storage";
import { subscribeRuntimeEvents } from "@/lib/runtime-events";
import { trackMobileEvent } from "@/lib/telemetry";
import { deregisterPushToken } from "@/lib/push-notifications";

import type { AuthMeResponse, MobileTokenExchangeResponse } from "@habita/contracts";
import type { ReactNode } from "react";

interface MobileAuthContextValue {
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  me: AuthMeResponse | null;
  activeHouseholdId: string | null;
  hydrate: () => Promise<void>;
  exchangeTokens: (input: { accessToken: string; refreshToken: string; expiresInSeconds?: number }) => Promise<void>;
  exchangeGoogleIdToken: (idToken: string) => Promise<void>;
  exchangeGoogleAuthCode: (authCode: string, codeVerifier: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  logout: () => Promise<void>;
  setHouseholdId: (householdId: string | null) => Promise<void>;
}

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

interface MobileAuthProviderProps {
  children: ReactNode;
}

export function MobileAuthProvider({ children }: MobileAuthProviderProps) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    setIsBootstrapping(true);
    const session = await getMobileSessionSnapshot();
    setActiveHouseholdIdState(session.householdId);

    if (!session.accessToken) {
      setMe(null);
      setIsBootstrapping(false);
      return;
    }

    try {
      const meResponse = await mobileApi.get<AuthMeResponse>("/api/auth/me");
      setMe(meResponse);
      const fallbackHouseholdId = meResponse.activeHouseholdId ?? meResponse.households[0]?.id ?? null;
      if (!session.householdId && fallbackHouseholdId) {
        await setActiveHousehold(fallbackHouseholdId);
        setActiveHouseholdIdState(fallbackHouseholdId);
      }
      scheduleProactiveRefresh();
    } catch (error) {
      // Auth errors (401 after failed refresh) → session already cleared by onUnauthorized
      // Network/other errors → keep tokens in storage so next open can retry
      if (error instanceof ApiError && error.status === 401) {
        trackMobileEvent("warn", "Hydration failed: session expired");
      } else {
        trackMobileEvent("warn", "Hydration failed (non-auth)", {
          error: error instanceof Error ? error.message : "unknown",
        });
      }
      setMe(null);
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    return subscribeRuntimeEvents((event) => {
      if (event.type !== "auth-expired") {
        return;
      }

      clearProactiveRefresh();
      setMe(null);
      setActiveHouseholdIdState(null);
      // No Alert.alert — the (app)/_layout Redirect handles navigation to login
    });
  }, []);

  const exchangeTokens = useCallback(
    async (input: { accessToken: string; refreshToken: string; expiresInSeconds?: number }) => {
      resetAuthExpiredFlag();
      await setMobileTokens(input.accessToken, input.refreshToken, input.expiresInSeconds);
      await hydrate();
    },
    [hydrate],
  );

  const exchangeGoogleIdToken = useCallback(
    async (idToken: string) => {
      const deviceId = await getOrCreateDeviceId();
      const response = await mobileApi.post<MobileTokenExchangeResponse>("/api/auth/mobile/exchange", {
        idToken,
        deviceId,
      });
      resetAuthExpiredFlag();
      await setMobileTokens(response.accessToken, response.refreshToken, response.expiresInSeconds);
      await hydrate();
    },
    [hydrate],
  );

  const exchangeGoogleAuthCode = useCallback(
    async (authCode: string, codeVerifier: string) => {
      const deviceId = await getOrCreateDeviceId();
      const response = await mobileApi.post<MobileTokenExchangeResponse>("/api/auth/mobile/exchange", {
        authCode,
        codeVerifier,
        deviceId,
      });
      resetAuthExpiredFlag();
      await setMobileTokens(response.accessToken, response.refreshToken, response.expiresInSeconds);
      await hydrate();
    },
    [hydrate],
  );

  const refreshAccessToken = useCallback(async () => {
    const session = await getMobileSessionSnapshot();
    if (!session.refreshToken) return;
    const deviceId = await getOrCreateDeviceId();

    const response = await mobileApi.post<MobileTokenExchangeResponse>("/api/auth/mobile/refresh", {
      refreshToken: session.refreshToken,
      deviceId,
    });
    resetAuthExpiredFlag();
    await setMobileTokens(response.accessToken, response.refreshToken, response.expiresInSeconds);
    await hydrate();
  }, [hydrate]);

  const logout = useCallback(async () => {
    clearProactiveRefresh();
    await deregisterPushToken();
    const session = await getMobileSessionSnapshot();
    if (session.refreshToken) {
      try {
        await mobileApi.post("/api/auth/mobile/logout", { refreshToken: session.refreshToken });
      } catch {
        // best effort
      }
    }
    await clearMobileSession();
    setMe(null);
    setActiveHouseholdIdState(null);
  }, []);

  const setHouseholdId = useCallback(async (householdId: string | null) => {
    await setActiveHousehold(householdId);
    setActiveHouseholdIdState(householdId);
  }, []);

  const value = useMemo<MobileAuthContextValue>(
    () => ({
      isBootstrapping,
      isAuthenticated: Boolean(me),
      me,
      activeHouseholdId,
      hydrate,
      exchangeTokens,
      exchangeGoogleIdToken,
      exchangeGoogleAuthCode,
      refreshAccessToken,
      logout,
      setHouseholdId,
    }),
    [
      isBootstrapping,
      me,
      activeHouseholdId,
      hydrate,
      exchangeTokens,
      exchangeGoogleIdToken,
      exchangeGoogleAuthCode,
      refreshAccessToken,
      logout,
      setHouseholdId,
    ],
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth(): MobileAuthContextValue {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error("useMobileAuth must be used within MobileAuthProvider");
  }
  return context;
}
