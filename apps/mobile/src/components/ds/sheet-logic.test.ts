import { describe, expect, it } from "vitest";
import { shouldDismissSheet } from "./sheet-logic";

describe("shouldDismissSheet", () => {
  it("dismisses when dragged past 30% of the sheet height", () => {
    expect(shouldDismissSheet(299, 1000, 0)).toBe(false);
    expect(shouldDismissSheet(300, 1000, 0)).toBe(true);
  });

  it("dismisses on a fast flick even if the drag distance is short", () => {
    expect(shouldDismissSheet(10, 1000, 800)).toBe(true);
    expect(shouldDismissSheet(10, 1000, 799)).toBe(false);
  });

  it("never dismisses on an upward drag", () => {
    expect(shouldDismissSheet(-500, 1000, 0)).toBe(false);
  });
});
