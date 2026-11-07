import { describe, expect, it } from "vitest";

import { detectedServiceKey, dueDateInfo, gmailStatusText } from "@/components/features/plata/servicios/servicios-logic";

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

describe("gmailStatusText", () => {
  it("prompts to connect when Gmail isn't connected", () => {
    expect(gmailStatusText({ connected: false, lastScanAt: null }, NOW)).toBe("Gmail no conectado");
  });

  it("shows connected without a scan yet", () => {
    expect(gmailStatusText({ connected: true, lastScanAt: null }, NOW)).toBe(
      "Gmail conectado · todavía no se revisó",
    );
  });

  it("shows today's scan time", () => {
    const lastScanAt = new Date(2026, 10, 3, 7, 0, 0).toISOString();
    expect(gmailStatusText({ connected: true, lastScanAt }, NOW)).toBe("Gmail conectado · revisado hoy 07:00");
  });

  it("shows the date for a scan on a previous day", () => {
    const lastScanAt = new Date(2026, 10, 1, 7, 0, 0).toISOString();
    expect(gmailStatusText({ connected: true, lastScanAt }, NOW)).toBe("Gmail conectado · revisado el 1 nov");
  });
});

describe("detectedServiceKey", () => {
  it("is case-insensitive and stable for the same sender and title", () => {
    const a = detectedServiceKey({ title: "Netflix", senderEmail: "info@Netflix.com" });
    const b = detectedServiceKey({ title: "netflix", senderEmail: "INFO@netflix.com" });
    expect(a).toBe(b);
  });

  it("differs for a different sender", () => {
    const a = detectedServiceKey({ title: "Netflix", senderEmail: "info@netflix.com" });
    const b = detectedServiceKey({ title: "Netflix", senderEmail: "billing@netflix.com" });
    expect(a).not.toBe(b);
  });
});
