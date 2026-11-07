import { describe, it, expect } from "vitest";
import { ApiError } from "@habita/api-client";
import { isNetworkError, nextProbeDelayMs, offlineMutationRetry } from "@/lib/offline-network";

describe("isNetworkError", () => {
  it("is true for the shared client's wrapped connectivity failure", () => {
    expect(isNetworkError(new ApiError("Network error", 0, "NETWORK_ERROR"))).toBe(true);
  });

  it("is false for an HTTP error response", () => {
    expect(isNetworkError(new ApiError("No encontrado", 404, "NOT_FOUND"))).toBe(false);
  });

  it("is false for a non-ApiError value", () => {
    expect(isNetworkError(new Error("boom"))).toBe(false);
  });
});

describe("nextProbeDelayMs", () => {
  it("starts at 5s", () => {
    expect(nextProbeDelayMs(0)).toBe(5_000);
  });

  it("backs off through 15s and 30s", () => {
    expect(nextProbeDelayMs(1)).toBe(15_000);
    expect(nextProbeDelayMs(2)).toBe(30_000);
  });

  it("caps at 60s", () => {
    expect(nextProbeDelayMs(3)).toBe(60_000);
    expect(nextProbeDelayMs(10)).toBe(60_000);
  });
});

describe("offlineMutationRetry", () => {
  const networkError = new ApiError("Network error", 0, "NETWORK_ERROR");
  const appError = new ApiError("Conflicto", 409, "CONFLICT");

  it("retries a network error up to 3 times", () => {
    expect(offlineMutationRetry(0, networkError)).toBe(true);
    expect(offlineMutationRetry(2, networkError)).toBe(true);
    expect(offlineMutationRetry(3, networkError)).toBe(false);
  });

  it("never retries a real application error", () => {
    expect(offlineMutationRetry(0, appError)).toBe(false);
  });
});
