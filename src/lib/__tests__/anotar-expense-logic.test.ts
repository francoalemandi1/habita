import { describe, expect, it } from "vitest";
import { buildExpenseSplits, describeCustomSplit, isFundToggleVisible, resolveChargeToFund, summarizeCustomSplit } from "../anotar-expense-logic";

describe("summarizeCustomSplit", () => {
  it("reports balanced when the custom amounts sum to the total", () => {
    const summary = summarizeCustomSplit(1000, { a: "600", b: "400" }, ["a", "b"]);
    expect(summary.isBalanced).toBe(true);
    expect(summary.isOver).toBe(false);
    expect(summary.remaining).toBe(0);
  });

  it("reports remaining to assign when under the total", () => {
    const summary = summarizeCustomSplit(1000, { a: "300" }, ["a", "b"]);
    expect(summary.isBalanced).toBe(false);
    expect(summary.isOver).toBe(false);
    expect(summary.remaining).toBe(700);
  });

  it("reports over when the custom amounts exceed the total", () => {
    const summary = summarizeCustomSplit(1000, { a: "700", b: "500" }, ["a", "b"]);
    expect(summary.isBalanced).toBe(false);
    expect(summary.isOver).toBe(true);
    expect(summary.remaining).toBe(-200);
  });

  it("treats a missing or invalid amount as zero", () => {
    const summary = summarizeCustomSplit(100, { a: "not-a-number" }, ["a", "b"]);
    expect(summary.assignedTotal).toBe(0);
    expect(summary.remaining).toBe(100);
  });
});

describe("isFundToggleVisible", () => {
  it("is hidden when there is no fund", () => {
    expect(isFundToggleVisible(null, "GROCERIES")).toBe(false);
    expect(isFundToggleVisible(undefined, "GROCERIES")).toBe(false);
  });

  it("is hidden when the fund is inactive", () => {
    expect(isFundToggleVisible({ isActive: false, fundCategories: ["GROCERIES"] }, "GROCERIES")).toBe(false);
  });

  it("is hidden when the category isn't covered by the fund", () => {
    expect(isFundToggleVisible({ isActive: true, fundCategories: ["GROCERIES"] }, "FOOD")).toBe(false);
  });

  it("is visible when the fund is active and covers the category", () => {
    expect(isFundToggleVisible({ isActive: true, fundCategories: ["GROCERIES"] }, "GROCERIES")).toBe(true);
  });
});

describe("resolveChargeToFund", () => {
  it("is false when the toggle isn't visible, regardless of the user's choice", () => {
    expect(resolveChargeToFund(null, false)).toBe(false);
    expect(resolveChargeToFund(true, false)).toBe(false);
    expect(resolveChargeToFund(false, false)).toBe(false);
  });

  it("defaults to true when visible and the user hasn't touched it", () => {
    expect(resolveChargeToFund(null, true)).toBe(true);
  });

  it("honors an explicit true when visible", () => {
    expect(resolveChargeToFund(true, true)).toBe(true);
  });

  it("honors an explicit false when visible", () => {
    expect(resolveChargeToFund(false, true)).toBe(false);
  });
});

describe("buildExpenseSplits", () => {
  it("splits evenly for EQUAL, ignoring any leftover custom amounts", () => {
    const splits = buildExpenseSplits({
      amount: 100,
      splitType: "EQUAL",
      participantIds: ["a", "b"],
      customSplits: { a: "999" },
    });
    const total = splits.reduce((sum, split) => sum + split.amount, 0);
    expect(total).toBe(100);
  });

  it("uses the typed-in amounts for CUSTOM", () => {
    const splits = buildExpenseSplits({
      amount: 100,
      splitType: "CUSTOM",
      participantIds: ["a", "b"],
      customSplits: { a: "60", b: "40" },
    });
    expect(splits).toEqual([
      { memberId: "a", amount: 60 },
      { memberId: "b", amount: 40 },
    ]);
  });
});

describe("describeCustomSplit", () => {
  it("says the amounts add up when nothing is left", () => {
    expect(describeCustomSplit(summarizeCustomSplit(100, { a: "60", b: "40" }, ["a", "b"]))).toEqual({ tone: "balanced", label: "Montos correctos" });
  });

  it("says how much is over when the amounts exceed the total", () => {
    expect(describeCustomSplit(summarizeCustomSplit(100, { a: "80", b: "40" }, ["a", "b"]))).toEqual({ tone: "over", label: "$20 de más" });
  });

  it("says how much is still unassigned", () => {
    expect(describeCustomSplit(summarizeCustomSplit(1500, { a: "500" }, ["a", "b"]))).toEqual({ tone: "under", label: "$1.000 por asignar" });
  });
});
