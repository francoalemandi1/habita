import { describe, expect, it } from "vitest";
import {
  splitEqually,
  splitByPercentage,
  validateCustomSplitSum,
  validatePercentageSum,
} from "@/lib/expense-splits";

describe("splitEqually", () => {
  it("splits 100 among 3 members without losing cents", () => {
    const shares = splitEqually(100, ["c", "a", "b"]);

    expect(shares).toEqual([
      { memberId: "a", amount: 33.34 },
      { memberId: "b", amount: 33.33 },
      { memberId: "c", amount: 33.33 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBeCloseTo(100, 2);
  });

  it("gives the 1 cent remainder to the first member by sorted id for 0.01 over 2", () => {
    const shares = splitEqually(0.01, ["b", "a"]);

    expect(shares).toEqual([
      { memberId: "a", amount: 0.01 },
      { memberId: "b", amount: 0 },
    ]);
  });

  it("returns the full amount for a single member", () => {
    const shares = splitEqually(100, ["a"]);

    expect(shares).toEqual([{ memberId: "a", amount: 100 }]);
  });
});

describe("validateCustomSplitSum", () => {
  it("rejects a mismatch beyond the tolerance", () => {
    const result = validateCustomSplitSum(100, [{ amount: 50 }, { amount: 40 }]);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });

  it("accepts a sum within tolerance", () => {
    const result = validateCustomSplitSum(100, [{ amount: 50 }, { amount: 50 }]);
    expect(result).toBeNull();
  });
});

describe("validatePercentageSum / splitByPercentage", () => {
  it("accepts percentages summing to 100 and splits amounts summing to the total", () => {
    const splits = [
      { memberId: "a", percentage: 33.33 },
      { memberId: "b", percentage: 33.33 },
      { memberId: "c", percentage: 33.34 },
    ];

    expect(validatePercentageSum(splits)).toBeNull();

    const shares = splitByPercentage(100, splits);
    const total = shares.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBeCloseTo(100, 2);
  });

  it("sums to exactly the total even when the ±0.01 tolerance would undershoot (33.33x3)", () => {
    const splits = [
      { memberId: "a", percentage: 33.33 },
      { memberId: "b", percentage: 33.33 },
      { memberId: "c", percentage: 33.33 },
    ];

    expect(validatePercentageSum(splits)).toBeNull();

    const shares = splitByPercentage(100, splits);
    const totalCents = Math.round(shares.reduce((sum, s) => sum + s.amount, 0) * 100);
    expect(totalCents).toBe(10000);
  });

  it("sums to exactly the total even when the ±0.01 tolerance would overshoot (33.34x2+33.33)", () => {
    const splits = [
      { memberId: "a", percentage: 33.34 },
      { memberId: "b", percentage: 33.34 },
      { memberId: "c", percentage: 33.33 },
    ];

    expect(validatePercentageSum(splits)).toBeNull();

    const shares = splitByPercentage(100, splits);
    const totalCents = Math.round(shares.reduce((sum, s) => sum + s.amount, 0) * 100);
    expect(totalCents).toBe(10000);
  });

  it("rejects percentages summing to 99", () => {
    const splits = [
      { memberId: "a", percentage: 33 },
      { memberId: "b", percentage: 33 },
      { memberId: "c", percentage: 33 },
    ];

    expect(validatePercentageSum(splits)).toEqual({ ok: false, error: expect.any(String) });
  });
});
