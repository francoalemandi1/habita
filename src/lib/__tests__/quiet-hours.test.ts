import { describe, expect, it } from "vitest";
import { isWithinQuietHours } from "@habita/domain";

describe("isWithinQuietHours", () => {
  it("returns false when start equals end (quiet hours off)", () => {
    expect(isWithinQuietHours({ start: 10, end: 10, hour: 10 })).toBe(false);
  });

  it("returns true for an hour inside a same-day window", () => {
    expect(isWithinQuietHours({ start: 13, end: 15, hour: 14 })).toBe(true);
  });

  it("returns false for an hour outside a same-day window", () => {
    expect(isWithinQuietHours({ start: 13, end: 15, hour: 16 })).toBe(false);
    expect(isWithinQuietHours({ start: 13, end: 15, hour: 13 - 1 })).toBe(false);
  });

  it("excludes the end hour (half-open interval)", () => {
    expect(isWithinQuietHours({ start: 13, end: 15, hour: 15 })).toBe(false);
  });

  it("handles a window that crosses midnight", () => {
    expect(isWithinQuietHours({ start: 23, end: 8, hour: 0 })).toBe(true);
    expect(isWithinQuietHours({ start: 23, end: 8, hour: 23 })).toBe(true);
    expect(isWithinQuietHours({ start: 23, end: 8, hour: 7 })).toBe(true);
    expect(isWithinQuietHours({ start: 23, end: 8, hour: 8 })).toBe(false);
    expect(isWithinQuietHours({ start: 23, end: 8, hour: 12 })).toBe(false);
  });
});
