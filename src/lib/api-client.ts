/**
 * Typed fetch wrapper for API calls from client components.
 * Handles 401/403 with automatic redirect to login.
 * Returns parsed JSON with proper error extraction.
 */

interface ApiErrorResponse {
  error: string;
  code?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch wrapper that:
 * - Adds Content-Type for JSON bodies
 * - Redirects to /login on 401 (session expired)
 * - Throws ApiError with parsed error message from the response
 *
 * Usage:
 *   const data = await apiFetch<{ task: Task }>("/api/tasks", { method: "POST", body: { name: "..." } });
 */
export async function apiFetch<T>(
  url: string,
  options?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, headers, ...rest } = options ?? {};

  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Session expired — redirect to landing
  if (response.status === 401) {
    window.location.href = "/";
    throw new ApiError("Sesión expirada", 401, "UNAUTHORIZED");
  }

  if (!response.ok) {
    let errorMessage = "Error inesperado";
    let errorCode: string | undefined;

    try {
      const errorData: ApiErrorResponse = await response.json();
      errorMessage = errorData.error || errorMessage;
      errorCode = errorData.code;
    } catch {
      // Response wasn't JSON — use status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(errorMessage, response.status, errorCode);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
