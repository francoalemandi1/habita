import { describe, expect, it } from "vitest";
import { buildTransferBannerText, formatCasaMonthLabel } from "./casa-format";

describe("formatCasaMonthLabel", () => {
  it("returns the capitalized Spanish month name", () => {
    expect(formatCasaMonthLabel(new Date(2026, 10, 3))).toBe("Noviembre");
    expect(formatCasaMonthLabel(new Date(2026, 0, 1))).toBe("Enero");
  });
});

describe("buildTransferBannerText", () => {
  it("returns an empty string when there are none", () => {
    expect(buildTransferBannerText(0, undefined, undefined)).toBe("");
  });

  it("names the person and task for a single transfer", () => {
    expect(buildTransferBannerText(1, "Sofi", "Lavar los platos")).toBe('Sofi quiere pasarte "Lavar los platos"');
  });

  it("falls back to a count for multiple transfers", () => {
    expect(buildTransferBannerText(3, "Sofi", "Lavar los platos")).toBe("3 tareas por resolver");
  });
});
