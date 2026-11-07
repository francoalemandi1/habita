import { describe, expect, it } from "vitest";

import {
  buildMiniBars,
  buildMonthComparisonText,
  dayGroupLabel,
  formatMonthLabel,
  groupExpensesByDay,
  monthKeyToLabel,
  payerMetaText,
} from "@/components/features/plata/gastos/gastos-logic";

describe("formatMonthLabel", () => {
  it("returns the upper-case month name", () => {
    expect(formatMonthLabel(new Date(2026, 10, 3))).toBe("NOVIEMBRE");
  });
});

describe("monthKeyToLabel", () => {
  it("capitalizes the month name from a YYYY-MM key", () => {
    expect(monthKeyToLabel("2026-10")).toBe("Octubre");
  });
});

describe("dayGroupLabel", () => {
  const now = new Date(2026, 10, 3, 12, 0, 0);

  it("labels today as Hoy", () => {
    expect(dayGroupLabel(new Date(2026, 10, 3, 9), now)).toBe("Hoy");
  });

  it("labels yesterday as Ayer", () => {
    expect(dayGroupLabel(new Date(2026, 10, 2, 9), now)).toBe("Ayer");
  });

  it("labels any other day as weekday + day + abbreviated month", () => {
    expect(dayGroupLabel(new Date(2026, 10, 2 - 1, 9), now)).toBe("Domingo 1 nov");
  });
});

describe("groupExpensesByDay", () => {
  const now = new Date(2026, 10, 3, 12, 0, 0);

  it("buckets consecutive same-day rows and preserves order", () => {
    const rows = [
      { id: "a", date: new Date(2026, 10, 3, 10) },
      { id: "b", date: new Date(2026, 10, 3, 9) },
      { id: "c", date: new Date(2026, 10, 2, 9) },
    ];

    const groups = groupExpensesByDay(rows, now);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBe("Hoy");
    expect(groups[0]?.items.map((r) => r.id)).toEqual(["a", "b"]);
    expect(groups[1]?.label).toBe("Ayer");
    expect(groups[1]?.items.map((r) => r.id)).toEqual(["c"]);
  });

  it("accepts ISO date strings", () => {
    const groups = groupExpensesByDay([{ id: "a", date: new Date(2026, 10, 3, 10).toISOString() }], now);
    expect(groups[0]?.label).toBe("Hoy");
  });
});

describe("payerMetaText", () => {
  it("returns 'Pagaste vos' for the current member's own payment", () => {
    expect(payerMetaText({ paidByName: "Sofi", isCurrentUserPayer: true, splitCount: 3 })).toBe("Pagaste vos");
  });

  it("names the payer and the split size", () => {
    expect(payerMetaText({ paidByName: "Sofi", isCurrentUserPayer: false, splitCount: 3 })).toBe("Pagó Sofi · entre 3");
  });

  it("omits the split size for a single-person split", () => {
    expect(payerMetaText({ paidByName: "Sofi", isCurrentUserPayer: false, splitCount: 1 })).toBe("Pagó Sofi");
  });
});

describe("buildMonthComparisonText", () => {
  it("builds the comparison + projection line when the trend is reliable", () => {
    const text = buildMonthComparisonText({
      hasReliableMonthlyTrend: true,
      monthlyHistory: [
        { month: "2026-09", total: 100_000 },
        { month: "2026-10", total: 200_000 },
        { month: "2026-11", total: 184_000 },
      ],
      projectedTotal: 268_000,
    });

    expect(text).toBe("8% menos que octubre · proyección $268.000");
  });

  it("returns null when the trend isn't reliable yet", () => {
    expect(
      buildMonthComparisonText({
        hasReliableMonthlyTrend: false,
        monthlyHistory: [{ month: "2026-10", total: 100 }, { month: "2026-11", total: 90 }],
        projectedTotal: 100,
      }),
    ).toBeNull();
  });

  it("returns null without a previous month to compare against", () => {
    expect(
      buildMonthComparisonText({
        hasReliableMonthlyTrend: true,
        monthlyHistory: [{ month: "2026-11", total: 90 }],
        projectedTotal: 100,
      }),
    ).toBeNull();
  });
});

describe("buildMiniBars", () => {
  it("marks only the last point as current", () => {
    const bars = buildMiniBars([
      { month: "2026-09", total: 1 },
      { month: "2026-10", total: 2 },
      { month: "2026-11", total: 3 },
    ]);

    expect(bars.map((b) => b.isCurrent)).toEqual([false, false, true]);
  });
});
