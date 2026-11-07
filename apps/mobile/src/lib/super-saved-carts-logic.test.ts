import { describe, expect, it } from "vitest";
import { formatCartAge, isCartStale, pickCartsToAutoRefresh } from "./super-saved-carts-logic";

describe("isCartStale", () => {
  it("is false just under 24h and true just over", () => {
    const now = new Date(2026, 10, 3, 12, 0, 0);
    expect(isCartStale(new Date(2026, 10, 2, 12, 1, 0).toISOString(), now)).toBe(false);
    expect(isCartStale(new Date(2026, 10, 2, 11, 59, 0).toISOString(), now)).toBe(true);
  });
});

describe("formatCartAge", () => {
  it("formats minutes, hours and days", () => {
    const now = new Date(2026, 10, 3, 12, 0, 0);
    expect(formatCartAge(new Date(2026, 10, 3, 11, 50, 0).toISOString(), now)).toBe("hace 10 minutos");
    expect(formatCartAge(new Date(2026, 10, 3, 9, 0, 0).toISOString(), now)).toBe("hace 3 horas");
    expect(formatCartAge(new Date(2026, 10, 1, 12, 0, 0).toISOString(), now)).toBe("hace 2 días");
  });

  it("falls back to 'hace un momento' for very recent dates", () => {
    const now = new Date(2026, 10, 3, 12, 0, 0);
    expect(formatCartAge(now.toISOString(), now)).toBe("hace un momento");
  });
});

describe("pickCartsToAutoRefresh", () => {
  it("skips fresh carts and caps at 3, oldest first", () => {
    const now = new Date(2026, 10, 3, 12, 0, 0);
    const carts = [
      { id: "fresh", refreshedAt: now.toISOString() },
      { id: "a", refreshedAt: new Date(2026, 10, 1).toISOString() },
      { id: "b", refreshedAt: new Date(2026, 9, 1).toISOString() },
      { id: "c", refreshedAt: new Date(2026, 8, 1).toISOString() },
      { id: "d", refreshedAt: new Date(2026, 7, 1).toISOString() },
    ];
    const picked = pickCartsToAutoRefresh(carts, now);
    expect(picked.map((c) => c.id)).toEqual(["d", "c", "b"]);
  });
});
