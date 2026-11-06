import { describe, expect, it } from "vitest";
import { formatNotificationTime } from "@/lib/avisos-logic";

describe("formatNotificationTime", () => {
  const now = new Date("2026-11-06T12:00:00.000Z");

  it("shows 'ahora' for the same minute", () => {
    expect(formatNotificationTime("2026-11-06T11:59:30.000Z", now)).toBe("ahora");
  });

  it("shows minutes for under an hour", () => {
    expect(formatNotificationTime("2026-11-06T11:40:00.000Z", now)).toBe("hace 20 min");
  });

  it("shows 'hoy' with the time for the same day", () => {
    expect(formatNotificationTime("2026-11-06T09:00:00.000Z", now)).toMatch(/^hoy /);
  });

  it("shows 'ayer' for the previous day", () => {
    expect(formatNotificationTime("2026-11-05T09:00:00.000Z", now)).toMatch(/^ayer /);
  });
});
