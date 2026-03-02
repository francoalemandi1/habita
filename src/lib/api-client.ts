import { ApiError, createApiClient } from "@habita/api-client";

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

  switch (method) {
    case "GET":
      return webApiClient.get<T>(url, { headers, signal });
    case "POST":
      return webApiClient.post<T>(url, options?.body, { headers, signal });
    case "PUT":
      return webApiClient.put<T>(url, options?.body, { headers, signal });
    case "PATCH":
      return webApiClient.patch<T>(url, options?.body, { headers, signal });
    case "DELETE":
      return webApiClient.delete<T>(url, { headers, signal });
    default:
      throw new ApiError("Método HTTP no soportado", 400, "INVALID_METHOD");
  }
}

export { ApiError };
