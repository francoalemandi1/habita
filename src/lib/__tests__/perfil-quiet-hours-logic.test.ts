import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUIET_HOURS_END,
  DEFAULT_QUIET_HOURS_START,
  isValidQuietHoursRange,
  quietHoursLabel,
  toggleQuietHours,
} from "@/lib/perfil-quiet-hours-logic";

describe("toggleQuietHours", () => {
  it("seeds the handoff defaults when enabled", () => {
    expect(toggleQuietHours(true)).toEqual({ start: DEFAULT_QUIET_HOURS_START, end: DEFAULT_QUIET_HOURS_END });
  });

  it("clears both hours when disabled", () => {
    expect(toggleQuietHours(false)).toEqual({ start: null, end: null });
  });
});

describe("isValidQuietHoursRange", () => {
  it("rejects equal start and end", () => {
    expect(isValidQuietHoursRange(10, 10)).toBe(false);
  });

  it("accepts a different start and end", () => {
    expect(isValidQuietHoursRange(23, 8)).toBe(true);
  });
});

describe("quietHoursLabel", () => {
  it("formats the handoff copy", () => {
    expect(quietHoursLabel(23, 8)).toBe("No molestar de 23 a 8 h");
  });
});
