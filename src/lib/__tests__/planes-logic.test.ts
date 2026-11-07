import { describe, expect, it } from "vitest";

import {
  filterPlansByCategory,
  formatPlanDateLabel,
  formatPlanPriceLabel,
  formatPlanRowMeta,
  getVisiblePlanCategories,
  sortPlansByDate,
} from "@/lib/planes-logic";

import type { EventCategory } from "@habita/contracts";

interface FakePlan {
  category: EventCategory;
  startDate: string | null;
  venueName: string | null;
}

function buildPlan(overrides: Partial<FakePlan>): FakePlan {
  return { category: "CINE", startDate: null, venueName: null, ...overrides };
}

describe("getVisiblePlanCategories", () => {
  it("returns only categories present in the events, in display order", () => {
    const events = [buildPlan({ category: "MUSICA" }), buildPlan({ category: "CINE" })];
    expect(getVisiblePlanCategories(events)).toEqual(["CINE", "MUSICA"]);
  });

  it("returns an empty list when there are no events", () => {
    expect(getVisiblePlanCategories([])).toEqual([]);
  });
});

describe("filterPlansByCategory", () => {
  const events = [buildPlan({ category: "CINE" }), buildPlan({ category: "TEATRO" })];

  it("returns every event when category is null", () => {
    expect(filterPlansByCategory(events, null)).toHaveLength(2);
  });

  it("keeps only events matching the category", () => {
    expect(filterPlansByCategory(events, "TEATRO")).toEqual([events[1]]);
  });
});

describe("sortPlansByDate", () => {
  it("orders events soonest first", () => {
    const later = buildPlan({ startDate: "2026-11-10T00:00:00.000Z" });
    const sooner = buildPlan({ startDate: "2026-11-05T00:00:00.000Z" });
    expect(sortPlansByDate([later, sooner])).toEqual([sooner, later]);
  });

  it("pushes events without a date to the end", () => {
    const dated = buildPlan({ startDate: "2026-11-05T00:00:00.000Z" });
    const undated = buildPlan({ startDate: null });
    expect(sortPlansByDate([undated, dated])).toEqual([dated, undated]);
  });
});

describe("formatPlanDateLabel", () => {
  const now = new Date(2026, 10, 6);

  it("returns null when there is no date", () => {
    expect(formatPlanDateLabel(null, now)).toBeNull();
  });

  it("labels today's date as Hoy", () => {
    expect(formatPlanDateLabel(new Date(2026, 10, 6, 20).toISOString(), now)).toBe("Hoy");
  });

  it("labels tomorrow as Mañana", () => {
    expect(formatPlanDateLabel(new Date(2026, 10, 7).toISOString(), now)).toBe("Mañana");
  });

  it("labels a date within the week with weekday and day", () => {
    const label = formatPlanDateLabel(new Date(2026, 10, 10).toISOString(), now);
    expect(label).toMatch(/\d+ nov/);
  });

  it("labels a far date compactly", () => {
    const label = formatPlanDateLabel(new Date(2026, 11, 20).toISOString(), now);
    expect(label).toBe("20 dic");
  });
});

describe("formatPlanRowMeta", () => {
  const now = new Date(2026, 10, 6);

  it("joins date and venue", () => {
    expect(formatPlanRowMeta({ startDate: new Date(2026, 10, 6).toISOString(), venueName: "Teatro Colón" }, now)).toBe(
      "Hoy · Teatro Colón",
    );
  });

  it("falls back to only the venue when there is no date", () => {
    expect(formatPlanRowMeta({ startDate: null, venueName: "Teatro Colón" }, now)).toBe("Teatro Colón");
  });

  it("returns undefined when neither date nor venue are available", () => {
    expect(formatPlanRowMeta({ startDate: null, venueName: null }, now)).toBeUndefined();
  });
});

describe("formatPlanPriceLabel", () => {
  it("returns Consultar when both bounds are unknown", () => {
    expect(formatPlanPriceLabel(null, null)).toBe("Consultar");
  });

  it("returns Gratis when the minimum is zero", () => {
    expect(formatPlanPriceLabel(0, null)).toBe("Gratis");
  });

  it("returns a formatted minimum price with a plus sign", () => {
    expect(formatPlanPriceLabel(5000, null)).toBe("$5.000+");
  });
});
