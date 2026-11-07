import { describe, expect, it } from "vitest";
import { ApiError } from "@habita/api-client";
import { isNetworkError, nextProbeDelayMs } from "../offline-network";

describe("isNetworkError", () => {
  it("is true for an ApiError with code NETWORK_ERROR", () => {
    expect(isNetworkError(new ApiError("Network error", 0, "NETWORK_ERROR"))).toBe(true);
  });

  it("is false for an ApiError that reached the server (HTTP 4xx/5xx)", () => {
    expect(isNetworkError(new ApiError("Not found", 404, "NOT_FOUND"))).toBe(false);
    expect(isNetworkError(new ApiError("Server error", 500))).toBe(false);
  });

  it("is true for the fetch TypeError React Native throws when offline", () => {
    expect(isNetworkError(new TypeError("Network request failed"))).toBe(true);
  });

  it("is true for the fetch TypeError the web runtime throws when offline", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("is false for an unrelated TypeError", () => {
    expect(isNetworkError(new TypeError("Cannot read property of undefined"))).toBe(false);
  });

  it("is false for a plain Error or a non-error value", () => {
    expect(isNetworkError(new Error("boom"))).toBe(false);
    expect(isNetworkError("boom")).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe("nextProbeDelayMs", () => {
  it("follows the 5s → 15s → 30s → 60s backoff schedule", () => {
    expect(nextProbeDelayMs(0)).toBe(5_000);
    expect(nextProbeDelayMs(1)).toBe(15_000);
    expect(nextProbeDelayMs(2)).toBe(30_000);
    expect(nextProbeDelayMs(3)).toBe(60_000);
  });

  it("clamps at 60s for any attempt beyond the schedule", () => {
    expect(nextProbeDelayMs(4)).toBe(60_000);
    expect(nextProbeDelayMs(100)).toBe(60_000);
  });

  it("clamps negative attempts to the first delay", () => {
    expect(nextProbeDelayMs(-1)).toBe(5_000);
  });
});
