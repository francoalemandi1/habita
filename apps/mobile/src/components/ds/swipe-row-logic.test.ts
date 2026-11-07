import { describe, expect, it } from "vitest";
import { resolveSwipeAction, SWIPE_WIDTHS } from "./swipe-row-logic";

describe("resolveSwipeAction", () => {
  it("does nothing below any threshold", () => {
    expect(resolveSwipeAction(10)).toBe("none");
    expect(resolveSwipeAction(-10)).toBe("none");
  });

  it("commits 'done' past 40% of the right action width", () => {
    const threshold = SWIPE_WIDTHS.done * 0.4;
    expect(resolveSwipeAction(threshold - 1)).toBe("none");
    expect(resolveSwipeAction(threshold)).toBe("done");
  });

  it("commits 'pass' past 40% of the pass action width", () => {
    const threshold = SWIPE_WIDTHS.pass * 0.4;
    expect(resolveSwipeAction(-threshold)).toBe("pass");
  });

  it("commits 'delete' once the drag reaches past the pass width plus 40% of delete", () => {
    const deleteThreshold = SWIPE_WIDTHS.pass + SWIPE_WIDTHS.delete * 0.4;
    expect(resolveSwipeAction(-deleteThreshold)).toBe("delete");
  });
});
