import { describe, expect, it } from "vitest";
import { formatEventPriceLabel, pickDestacadoEvent, toEventSaveInput } from "./casa-event";

import type { EventItem } from "@habita/contracts";

function buildEvent(overrides: Partial<EventItem>): EventItem {
  return {
    id: "e1",
    title: "Feria de diseño",
    description: null,
    slug: "feria-de-diseno",
    startDate: null,
    endDate: null,
    venueName: null,
    address: null,
    cityId: null,
    province: null,
    category: "FESTIVALES",
    tags: [],
    artists: [],
    priceMin: null,
    priceMax: null,
    currency: null,
    sourceUrl: null,
    imageUrl: null,
    ...overrides,
  };
}

describe("pickDestacadoEvent", () => {
  const now = new Date(2026, 10, 3);

  it("returns null when there are no upcoming events", () => {
    const past = buildEvent({ startDate: new Date(2026, 10, 1).toISOString() });
    expect(pickDestacadoEvent([past], now)).toBeNull();
  });

  it("prefers an editorially highlighted upcoming event", () => {
    const plain = buildEvent({ id: "plain", startDate: new Date(2026, 10, 4).toISOString() });
    const highlighted = buildEvent({
      id: "highlighted",
      startDate: new Date(2026, 10, 6).toISOString(),
      editorialHighlight: "No te lo pierdas",
    });
    expect(pickDestacadoEvent([plain, highlighted], now)?.id).toBe("highlighted");
  });

  it("falls back to the soonest upcoming event without an editorial pick", () => {
    const soon = buildEvent({ id: "soon", startDate: new Date(2026, 10, 4).toISOString() });
    const later = buildEvent({ id: "later", startDate: new Date(2026, 10, 10).toISOString() });
    expect(pickDestacadoEvent([later, soon], now)?.id).toBe("soon");
  });
});

describe("toEventSaveInput", () => {
  it("maps price range and keeps the source event id", () => {
    const event = buildEvent({ priceMin: 0, priceMax: 0 });
    expect(toEventSaveInput(event)).toMatchObject({ culturalEventId: "e1", priceRange: "Gratis" });
  });
});

describe("formatEventPriceLabel", () => {
  it("returns Gratis for a free event", () => {
    expect(formatEventPriceLabel(0, 0)).toBe("Gratis");
  });

  it("returns a '$X+' label for a priced event", () => {
    expect(formatEventPriceLabel(5000, null)).toBe("$5.000+");
  });

  it("returns Consultar when there is no price info", () => {
    expect(formatEventPriceLabel(null, null)).toBe("Consultar");
  });
});
