import { describe, expect, it } from "vitest";

import {
  buildCategoryBars,
  buildMonthTotalBars,
  tipTone,
} from "@/components/features/plata/como-venimos/como-venimos-logic";

describe("buildCategoryBars", () => {
  it("sorts by amount descending and scales widths to the largest category", () => {
    const bars = buildCategoryBars(
      [
        { category: "FOOD", amount: 5000 },
        { category: "GROCERIES", amount: 10000 },
      ],
      null,
    );
    expect(bars.map((b) => b.category)).toEqual(["GROCERIES", "FOOD"]);
    expect(bars[0]!.widthPercent).toBe(100);
    expect(bars[1]!.widthPercent).toBe(50);
  });

  it("flags the rising category and no other", () => {
    const bars = buildCategoryBars(
      [
        { category: "FOOD", amount: 5000 },
        { category: "GROCERIES", amount: 10000 },
      ],
      "FOOD",
    );
    expect(bars.find((b) => b.category === "FOOD")!.isRising).toBe(true);
    expect(bars.find((b) => b.category === "GROCERIES")!.isRising).toBe(false);
  });

  it("returns an empty array for no categories without dividing by zero", () => {
    expect(buildCategoryBars([], null)).toEqual([]);
  });
});

describe("buildMonthTotalBars", () => {
  const history = [
    { month: "2026-07", total: 100000 },
    { month: "2026-08", total: 150000 },
    { month: "2026-09", total: 120000 },
    { month: "2026-10", total: 200000 },
  ];

  it("keeps only the last 3 months for the 3-month segment", () => {
    const bars = buildMonthTotalBars(history, "3meses");
    expect(bars.map((b) => b.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("keeps the full available history for the year segment", () => {
    const bars = buildMonthTotalBars(history, "ano");
    expect(bars).toHaveLength(4);
  });

  it("marks only the last month as current", () => {
    const bars = buildMonthTotalBars(history, "3meses");
    expect(bars.map((b) => b.isCurrent)).toEqual([false, false, true]);
  });
});

describe("tipTone", () => {
  it("maps info to positive and everything else to act", () => {
    expect(tipTone("info")).toBe("positive");
    expect(tipTone("alerta")).toBe("act");
    expect(tipTone("critica")).toBe("act");
  });
});
