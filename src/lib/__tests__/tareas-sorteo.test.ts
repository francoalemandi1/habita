import { describe, expect, it } from "vitest";
import { pickSorteoWinner } from "../tareas-sorteo";

describe("pickSorteoWinner", () => {
  it("returns null for an empty candidate list", () => {
    expect(pickSorteoWinner([])).toBeNull();
  });

  it("picks the candidate at the index resolved by the injected random source", () => {
    const candidates = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(pickSorteoWinner(candidates, () => 0)).toEqual({ id: "a" });
    expect(pickSorteoWinner(candidates, () => 0.99)).toEqual({ id: "c" });
  });

  it("clamps an edge-case random value of exactly 1 to the last candidate", () => {
    const candidates = [{ id: "a" }, { id: "b" }];
    expect(pickSorteoWinner(candidates, () => 1)).toEqual({ id: "b" });
  });
});
