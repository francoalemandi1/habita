import { createApiClient } from "@habita/api-client";

import { mobileConfig } from "./config";
import { getMobileSessionSnapshot } from "./storage";
import { trackMobileEvent } from "./telemetry";

export const mobileApi = createApiClient({
  baseUrl: mobileConfig.apiBaseUrl,
  getAuth: async () => {
    const session = await getMobileSessionSnapshot();
    return {
      accessToken: session.accessToken,
      householdId: session.householdId,
    };
  },
  onAuthFailure: async () => {
    trackMobileEvent("warn", "Authentication failed in mobile API client");
  },
});
