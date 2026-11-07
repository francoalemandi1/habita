import { describe, it, expect } from "vitest";
import { shouldShowSkeleton, SKELETON_MIN_DELAY_MS } from "@/components/ds/lib/skeleton-logic";

describe("shouldShowSkeleton", () => {
  it("hides the skeleton when data arrives under 300ms (§6.20)", () => {
    expect(shouldShowSkeleton(150)).toBe(false);
    expect(shouldShowSkeleton(299)).toBe(false);
  });

  it("shows the skeleton at or past the threshold", () => {
    expect(shouldShowSkeleton(SKELETON_MIN_DELAY_MS)).toBe(true);
    expect(shouldShowSkeleton(1000)).toBe(true);
  });
});
