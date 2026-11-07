import { describe, expect, it } from "vitest";

import {
  detectedServiceKey,
  DUE_DATE_TONE_COLOR_KEY,
  dueDateInfo,
  frequencyLabel,
  gmailStatusText,
  isRecurringFrequency,
  toRecurringFrequency,
} from "./plata-servicios-logic";

const NOW = new Date(2026, 10, 3, 10, 0, 0);

describe("dueDateInfo", () => {
  it("flags a past due date as overdue", () => {
    expect(dueDateInfo(new Date(2026, 10, 1).toISOString(), NOW)).toEqual({
      text: "Vencido hace 2 días",
      tone: "overdue",
    });
  });

  it("labels today as due today", () => {
    expect(dueDateInfo(new Date(2026, 10, 3).toISOString(), NOW)).toEqual({
      text: "Vence hoy",
      tone: "soon",
    });
  });

  it("flags a due date within 7 days as soon", () => {
    expect(dueDateInfo(new Date(2026, 10, 8).toISOString(), NOW)).toEqual({
      text: "Vence en 5 días",
      tone: "soon",
    });
  });

  it("treats a far due date as normal", () => {
    expect(dueDateInfo(new Date(2026, 10, 20).toISOString(), NOW)).toEqual({
      text: "Vence en 17 días",
      tone: "normal",
    });
  });
});

describe("frequencyLabel", () => {
  it("labels every known frequency", () => {
    expect(frequencyLabel("MONTHLY")).toBe("Mensual");
    expect(frequencyLabel("WEEKLY")).toBe("Semanal");
  });
});

describe("gmailStatusText", () => {
  it("prompts to connect when Gmail isn't connected", () => {
    expect(gmailStatusText({ connected: false, lastScanAt: null }, NOW)).toBe("Gmail no conectado");
  });

  it("shows today's scan time", () => {
    const lastScanAt = new Date(2026, 10, 3, 7, 0, 0).toISOString();
    expect(gmailStatusText({ connected: true, lastScanAt }, NOW)).toBe("Gmail conectado · revisado hoy 07:00");
  });
});

describe("detectedServiceKey", () => {
  it("is case-insensitive and stable for the same sender and title", () => {
    const a = detectedServiceKey({ title: "Netflix", senderEmail: "info@Netflix.com" });
    const b = detectedServiceKey({ title: "netflix", senderEmail: "INFO@netflix.com" });
    expect(a).toBe(b);
  });
});

describe("isRecurringFrequency", () => {
  it("accepts every known frequency", () => {
    expect(isRecurringFrequency("WEEKLY")).toBe(true);
    expect(isRecurringFrequency("YEARLY")).toBe(true);
  });

  it("rejects an unknown or malformed value", () => {
    expect(isRecurringFrequency("DAILY")).toBe(false);
  });
});

describe("toRecurringFrequency", () => {
  it("returns the value when it's a known frequency", () => {
    expect(toRecurringFrequency("BIMONTHLY", "MONTHLY")).toBe("BIMONTHLY");
  });

  it("falls back for null, undefined or an unknown value", () => {
    expect(toRecurringFrequency(null, "MONTHLY")).toBe("MONTHLY");
    expect(toRecurringFrequency("bogus", "MONTHLY")).toBe("MONTHLY");
  });
});

describe("DUE_DATE_TONE_COLOR_KEY", () => {
  it("maps every due-date tone to a theme color key", () => {
    expect(DUE_DATE_TONE_COLOR_KEY.overdue).toBe("ladrilloText");
    expect(DUE_DATE_TONE_COLOR_KEY.soon).toBe("mantecaText");
    expect(DUE_DATE_TONE_COLOR_KEY.normal).toBe("ink2");
  });
});
