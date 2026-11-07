import { describe, it, expect } from "vitest";
import { computeSplitBarSegments } from "@/components/ds/lib/split-bar-logic";

describe("computeSplitBarSegments", () => {
  it("splits evenly when values divide cleanly", () => {
    const result = computeSplitBarSegments(
      [{ id: "a", value: 50 }, { id: "b", value: 50 }],
      100
    );
    expect(result.map((s) => s.percent)).toEqual([50, 50]);
  });

  it("assigns the rounding remainder to the last non-zero segment", () => {
    const result = computeSplitBarSegments(
      [{ id: "a", value: 1 }, { id: "b", value: 1 }, { id: "c", value: 1 }],
      3
    );
    const total = result.reduce((sum, s) => sum + s.percent, 0);
    expect(total).toBe(100);
    expect(result[2]!.percent).toBeGreaterThanOrEqual(result[0]!.percent);
  });

  it("returns all zero percents when total is 0", () => {
    const result = computeSplitBarSegments([{ id: "a", value: 0 }], 0);
    expect(result).toEqual([{ id: "a", value: 0, percent: 0 }]);
  });

  it("does not assign remainder to a zero-value segment", () => {
    const result = computeSplitBarSegments(
      [{ id: "a", value: 1 }, { id: "b", value: 0 }],
      3
    );
    expect(result[1]!.percent).toBe(0);
  });
});
