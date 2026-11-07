import { describe, expect, it } from "vitest";

import { buildCategoryBars, buildMonthTotalBars, readTopGrowthCategory, tipTone } from "./plata-como-venimos-logic";

describe("buildCategoryBars", () => {
  it("sorts by amount descending and flags the rising category", () => {
    const bars = buildCategoryBars(
      [
        { category: "FOOD", amount: 5000 },
        { category: "GROCERIES", amount: 10000 },
      ],
      "FOOD",
    );
    expect(bars.map((b) => b.category)).toEqual(["GROCERIES", "FOOD"]);
    expect(bars.find((b) => b.category === "FOOD")!.isRising).toBe(true);
  });
});

describe("buildMonthTotalBars", () => {
  const history = [
    { month: "2026-08", total: 100000, fixed: 0, variable: 100000 },
    { month: "2026-09", total: 150000, fixed: 0, variable: 150000 },
    { month: "2026-10", total: 120000, fixed: 0, variable: 120000 },
  ];

  it("keeps only the last 3 months for the 3-month segment", () => {
    expect(buildMonthTotalBars(history, "3meses")).toHaveLength(3);
  });
});

describe("tipTone", () => {
  it("maps info to positive and everything else to act", () => {
    expect(tipTone("info")).toBe("positive");
    expect(tipTone("critica")).toBe("act");
  });
});

describe("readTopGrowthCategory", () => {
  it("reads a valid topGrowthCategory from an untyped response", () => {
    const data = { topGrowthCategory: { category: "FOOD", currentAmount: 100, averageAmount: 50, growthPercent: 100 } };
    expect(readTopGrowthCategory(data)).toBe("FOOD");
  });

  it("returns null when the field is missing or malformed", () => {
    expect(readTopGrowthCategory({})).toBeNull();
    expect(readTopGrowthCategory({ topGrowthCategory: null })).toBeNull();
    expect(readTopGrowthCategory({ topGrowthCategory: { category: "FOOD" } })).toBeNull();
  });

  it("returns null when the category isn't a known ExpenseCategory", () => {
    const data = { topGrowthCategory: { category: "NOT_A_CATEGORY", currentAmount: 100, averageAmount: 50, growthPercent: 100 } };
    expect(readTopGrowthCategory(data)).toBeNull();
  });
});
