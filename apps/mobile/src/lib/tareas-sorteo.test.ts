import { describe, expect, it } from "vitest";
import { pickSorteoWinner, resolveSorteoAvatarStyle, SORTEO_LOSER_OPACITY, SORTEO_WINNER_AVATAR_SIZE } from "./tareas-sorteo";

describe("pickSorteoWinner", () => {
  it("returns null for an empty list", () => {
    expect(pickSorteoWinner([])).toBeNull();
  });

  it("picks the member at the index implied by `random`", () => {
    expect(pickSorteoWinner(["a", "b", "c"], () => 0)).toBe("a");
    expect(pickSorteoWinner(["a", "b", "c"], () => 0.99)).toBe("c");
  });

  it("never selects an out-of-range index", () => {
    expect(pickSorteoWinner(["a", "b"], () => 0.9999999)).toBe("b");
  });
});

describe("resolveSorteoAvatarStyle", () => {
  it("keeps everyone idle before a result exists", () => {
    expect(resolveSorteoAvatarStyle("a", null)).toEqual({ size: 56, opacity: 1 });
  });

  it("scales the winner up and dims everyone else", () => {
    expect(resolveSorteoAvatarStyle("a", "a")).toEqual({ size: SORTEO_WINNER_AVATAR_SIZE, opacity: 1 });
    expect(resolveSorteoAvatarStyle("b", "a")).toEqual({ size: 56, opacity: SORTEO_LOSER_OPACITY });
  });
});
