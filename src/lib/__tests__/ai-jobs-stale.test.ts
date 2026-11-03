import { describe, it, expect } from "vitest";
import { isJobStale } from "../ai-jobs";

describe("isJobStale", () => {
  const threshold = 5 * 60 * 1000;

  it("returns false when the job just started", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    expect(isJobStale(startedAt, now, threshold)).toBe(false);
  });

  it("returns false when the job is running under the threshold", () => {
    const now = new Date("2026-01-01T00:04:59.000Z");
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    expect(isJobStale(startedAt, now, threshold)).toBe(false);
  });

  it("returns false exactly at the threshold boundary", () => {
    const now = new Date("2026-01-01T00:05:00.000Z");
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    expect(isJobStale(startedAt, now, threshold)).toBe(false);
  });

  it("returns true just past the threshold", () => {
    const now = new Date("2026-01-01T00:05:00.001Z");
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    expect(isJobStale(startedAt, now, threshold)).toBe(true);
  });

  it("returns true for a job running far past the threshold", () => {
    const now = new Date("2026-01-01T01:00:00.000Z");
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    expect(isJobStale(startedAt, now, threshold)).toBe(true);
  });
});
