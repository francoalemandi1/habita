import { describe, expect, it } from "vitest";

import { formatCartAge, isCartStale, pickCartsToAutoRefresh } from "@/lib/super-saved-carts-logic";

const NOW = new Date("2026-11-05T12:00:00.000Z");

describe("isCartStale", () => {
  it("is false under 24h", () => {
    expect(isCartStale("2026-11-05T00:00:01.000Z", NOW)).toBe(false);
  });

  it("is true over 24h", () => {
    expect(isCartStale("2026-11-03T00:00:00.000Z", NOW)).toBe(true);
  });
});

describe("formatCartAge", () => {
  it("formats days", () => {
    expect(formatCartAge("2026-11-02T12:00:00.000Z", NOW)).toBe("hace 3 días");
  });

  it("formats hours", () => {
    expect(formatCartAge("2026-11-05T09:00:00.000Z", NOW)).toBe("hace 3 horas");
  });

  it("formats minutes", () => {
    expect(formatCartAge("2026-11-05T11:55:00.000Z", NOW)).toBe("hace 5 minutos");
  });
});

describe("pickCartsToAutoRefresh", () => {
  const stale1 = { id: "a", refreshedAt: "2026-11-01T00:00:00.000Z" };
  const stale2 = { id: "b", refreshedAt: "2026-11-02T00:00:00.000Z" };
  const stale3 = { id: "c", refreshedAt: "2026-11-03T00:00:00.000Z" };
  const stale4 = { id: "d", refreshedAt: "2026-11-04T00:00:00.000Z" };
  const fresh = { id: "e", refreshedAt: "2026-11-05T11:00:00.000Z" };

  it("excludes fresh carts and caps stale ones at 3, oldest first", () => {
    const result = pickCartsToAutoRefresh([fresh, stale4, stale1, stale3, stale2], NOW);
    expect(result.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});
