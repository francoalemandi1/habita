import { describe, expect, it } from "vitest";
import { computeStaggerDelay } from "./tareas-stagger";

describe("computeStaggerDelay", () => {
  it("is zero for the first row and increases by 40ms per row", () => {
    expect(computeStaggerDelay(0)).toBe(0);
    expect(computeStaggerDelay(1)).toBe(40);
    expect(computeStaggerDelay(5)).toBe(200);
  });

  it("clamps negative indices to zero", () => {
    expect(computeStaggerDelay(-3)).toBe(0);
  });
});
