import { describe, expect, it } from "vitest";
import { computeSplitSegments } from "./split-bar-logic";

describe("computeSplitSegments", () => {
  it("splits proportionally and reports remaining fraction", () => {
    const { segments, remainingFraction } = computeSplitSegments([4, 4, 3], 18);

    expect(segments[0]?.fraction).toBeCloseTo(4 / 18);
    expect(segments[1]?.fraction).toBeCloseTo(4 / 18);
    expect(segments[2]?.fraction).toBeCloseTo(3 / 18);
    expect(remainingFraction).toBeCloseTo(7 / 18);
  });

  it("assigns seniority color indices in order, cycling every 3", () => {
    const { segments } = computeSplitSegments([1, 1, 1, 1], 4);

    expect(segments.map((s) => s.colorIndex)).toEqual([0, 1, 2, 0]);
  });

  it("returns no segments and full remaining fraction when total is zero", () => {
    expect(computeSplitSegments([1, 2], 0)).toEqual({ segments: [], remainingFraction: 1 });
  });

  it("clamps negative values to zero", () => {
    const { segments } = computeSplitSegments([-2, 10], 10);

    expect(segments[0]?.fraction).toBe(0);
    expect(segments[1]?.fraction).toBe(1);
  });
});
