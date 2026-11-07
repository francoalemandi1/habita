import { describe, it, expect } from "vitest";
import { computeDueDateForDayOfWeek } from "../plan-day-mapping";

describe("computeDueDateForDayOfWeek", () => {
  // Monday 2026-01-05, used as the plan's reference date (week start)
  const referenceDate = new Date(2026, 0, 5);
  const now = new Date(2026, 0, 5, 8, 0, 0, 0);

  it("maps 1 to Monday (reference date)", () => {
    const result = computeDueDateForDayOfWeek(1, referenceDate, now);
    expect(result.toDateString()).toBe(new Date(2026, 0, 5).toDateString());
  });

  it("maps 2..6 to Tue..Sat", () => {
    const expected = [2, 3, 4, 5, 6].map((d) => new Date(2026, 0, 4 + d).toDateString());
    const results = [2, 3, 4, 5, 6].map((d) =>
      computeDueDateForDayOfWeek(d, referenceDate, now).toDateString(),
    );
    expect(results).toEqual(expected);
  });

  it("maps 7 to Sunday", () => {
    const result = computeDueDateForDayOfWeek(7, referenceDate, now);
    expect(result.toDateString()).toBe(new Date(2026, 0, 11).toDateString());
  });

  it("treats 0 as Sunday", () => {
    const result = computeDueDateForDayOfWeek(0, referenceDate, now);
    expect(result.toDateString()).toBe(new Date(2026, 0, 11).toDateString());
  });

  it("falls back to end of today when dayOfWeek is missing", () => {
    const result = computeDueDateForDayOfWeek(undefined, referenceDate, now);
    expect(result.toDateString()).toBe(now.toDateString());
    expect(result.getHours()).toBe(23);
  });

  it("falls back to end of today when the computed date is already in the past", () => {
    const laterNow = new Date(2026, 0, 10, 8, 0, 0, 0); // Saturday, after Monday reference
    const result = computeDueDateForDayOfWeek(1, referenceDate, laterNow);
    expect(result.toDateString()).toBe(laterNow.toDateString());
  });
});
