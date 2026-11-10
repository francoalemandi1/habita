import { describe, expect, it } from "vitest";
import { formatAmountInput, formatDraftDateLabel, parseAmountInput } from "@/components/features/anotar/anotar-format";

describe("formatAmountInput", () => {
  it("groups thousands with dots", () => {
    expect(formatAmountInput(12000)).toBe("12.000");
  });

  it("renders zero as empty so the placeholder shows", () => {
    expect(formatAmountInput(0)).toBe("");
  });
});

describe("parseAmountInput", () => {
  it("reads dot-grouped thousands", () => {
    expect(parseAmountInput("12.000")).toBe(12000);
  });

  it("reads a comma as the decimal separator", () => {
    expect(parseAmountInput("1.250,5")).toBe(1250.5);
  });

  it("returns zero for empty input", () => {
    expect(parseAmountInput("")).toBe(0);
  });
});

describe("formatDraftDateLabel", () => {
  it("labels today", () => {
    expect(formatDraftDateLabel("2026-11-09", "2026-11-09")).toBe("Hoy");
  });

  it("labels yesterday", () => {
    expect(formatDraftDateLabel("2026-11-08", "2026-11-09")).toBe("Ayer");
  });

  it("shows day and short month for older dates", () => {
    expect(formatDraftDateLabel("2026-11-02", "2026-11-09")).toBe("2 nov");
  });
});
