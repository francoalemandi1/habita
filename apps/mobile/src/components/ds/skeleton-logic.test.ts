import { describe, expect, it } from "vitest";
import { shouldDisplaySkeleton, SKELETON_DELAY_MS } from "./skeleton-logic";

describe("shouldDisplaySkeleton", () => {
  it("hides the skeleton when loading resolves before the delay", () => {
    expect(shouldDisplaySkeleton(299)).toBe(false);
  });

  it("shows the skeleton once the delay elapses", () => {
    expect(shouldDisplaySkeleton(SKELETON_DELAY_MS)).toBe(true);
    expect(shouldDisplaySkeleton(500)).toBe(true);
  });

  it("respects a custom delay", () => {
    expect(shouldDisplaySkeleton(150, 100)).toBe(true);
    expect(shouldDisplaySkeleton(50, 100)).toBe(false);
  });
});
