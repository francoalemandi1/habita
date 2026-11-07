import { onlineManager } from "@tanstack/react-query";
import { ApiError, createApiClient } from "@habita/api-client";
import { isNetworkError } from "@/lib/offline-network";

const webApiClient = createApiClient({
  baseUrl: "",
  getAuth: async () => ({ accessToken: null, householdId: null }),
  onAuthFailure: async () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },
});

/**
 * Typed fetch wrapper for API calls from web client components.
 */
export async function apiFetch<T>(
  url: string,
  options?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const method = (options?.method ?? "GET").toUpperCase() as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  const headers = (options?.headers ?? {}) as Record<string, string>;
  const signal = options?.signal ?? undefined;

  try {
    switch (method) {
      case "GET":
        return await webApiClient.get<T>(url, { headers, signal });
      case "POST":
        return await webApiClient.post<T>(url, options?.body, { headers, signal });
      case "PUT":
        return await webApiClient.put<T>(url, options?.body, { headers, signal });
      case "PATCH":
        return await webApiClient.patch<T>(url, options?.body, { headers, signal });
      case "DELETE":
        return await webApiClient.delete<T>(url, { headers, signal });
      default:
        throw new ApiError("Método HTTP no soportado", 400, "INVALID_METHOD");
    }
  } catch (error) {
    // Feeds React Query's onlineManager so the offline banner, queued dots and
    // "Necesitás conexión" gates react to a real connectivity failure, never an HTTP error.
    if (isNetworkError(error)) onlineManager.setOnline(false);
    throw error;
  }
}

export { ApiError };
