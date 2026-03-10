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

interface ApiErrorResponse {
  error?: string;
  code?: string;
}

interface ClientAuthSnapshot {
  accessToken: string | null;
  householdId: string | null;
}

interface ApiClientOptions {
  baseUrl: string;
  getAuth: () => Promise<ClientAuthSnapshot>;
  onAuthFailure?: () => Promise<boolean | void> | boolean | void;
  onUnauthorized?: () => Promise<void> | void;
  onNetworkError?: (error: ApiError) => Promise<void> | void;
  networkRetries?: number;
  networkRetryDelayMs?: number;
  networkErrorMessage?: string;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiClient {
  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T>;
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T>;
  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T>;
  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  async function delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchWithRetry(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
    const retries = Math.max(0, options.networkRetries ?? 0);
    const retryDelayMs = Math.max(0, options.networkRetryDelayMs ?? 300);
    let attempt = 0;

    while (true) {
      try {
        return await fetch(url, init);
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }

        if (attempt >= retries) {
          const networkError = new ApiError(
            options.networkErrorMessage ?? "Network error",
            0,
            "NETWORK_ERROR",
          );
          if (options.onNetworkError) {
            await options.onNetworkError(networkError);
          }
          throw networkError;
        }

        attempt += 1;
        await delay(retryDelayMs * attempt);
      }
    }
  }

  async function request<T>(path: string, requestOptions: RequestOptions = {}): Promise<T> {
    const url = path.startsWith("http") ? path : `${options.baseUrl}${path}`;

    const executeRequest = async (): Promise<Response> => {
      const { accessToken, householdId } = await options.getAuth();
      return fetchWithRetry(
        url,
        {
          method: requestOptions.method ?? "GET",
          headers: {
            ...(requestOptions.body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(householdId ? { "x-habita-household-id": householdId } : {}),
            ...requestOptions.headers,
          },
          body: requestOptions.body !== undefined ? JSON.stringify(requestOptions.body) : undefined,
          signal: requestOptions.signal,
        },
        requestOptions.signal,
      );
    };

    let response = await executeRequest();

    if (response.status === 401) {
      let shouldRetry = false;
      if (options.onAuthFailure) {
        try {
          shouldRetry = Boolean(await options.onAuthFailure());
        } catch {
          // Auth refresh failed — fall through to unauthorized handling
        }
      }

      if (shouldRetry) {
        response = await executeRequest();
      }

      if (response.status === 401) {
        try {
          await options.onUnauthorized?.();
        } catch {
          // Ignore errors from unauthorized handler
        }
        throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      }
    }

    if (!response.ok) {
      let message = response.statusText || "Unexpected error";
      let code: string | undefined;
      try {
        const payload = (await response.json()) as ApiErrorResponse;
        message = payload.error || message;
        code = payload.code;
      } catch {
        // keep fallback
      }
      throw new ApiError(message, response.status, code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    get: (path, requestOptions) => request(path, { ...requestOptions, method: "GET" }),
    post: (path, body, requestOptions) => request(path, { ...requestOptions, method: "POST", body }),
    put: (path, body, requestOptions) => request(path, { ...requestOptions, method: "PUT", body }),
    patch: (path, body, requestOptions) => request(path, { ...requestOptions, method: "PATCH", body }),
    delete: (path, requestOptions) => request(path, { ...requestOptions, method: "DELETE" }),
  };
}
