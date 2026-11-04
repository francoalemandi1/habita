import { describe, expect, it } from "vitest";
import {
  isValidContributionAmount,
  monthLabelEs,
  quotaStatusLabel,
  suggestedContributionAmount,
} from "@/components/features/plata/fondo/fondo-logic";

describe("monthLabelEs", () => {
  it("maps a YYYY-MM period to its Spanish month name", () => {
    expect(monthLabelEs("2026-11")).toBe("noviembre");
    expect(monthLabelEs("2026-01")).toBe("enero");
  });
});

describe("suggestedContributionAmount", () => {
  it("suggests the pending quota for the current period", () => {
    const status = { memberId: "a", memberName: "A", allocation: 10_000, contributed: 3_000, pending: 7_000 };
    expect(suggestedContributionAmount(status)).toBe(7_000);
  });

  it("defaults to 0 when there is no status yet", () => {
    expect(suggestedContributionAmount(undefined)).toBe(0);
  });
});

describe("quotaStatusLabel", () => {
  it("reads 'Pendiente' when there's a pending amount", () => {
    const status = { memberId: "a", memberName: "A", allocation: 10_000, contributed: 0, pending: 10_000 };
    expect(quotaStatusLabel(status)).toBe("Pendiente");
  });

  it("reads 'Aportada' once the quota is fully paid", () => {
    const status = { memberId: "a", memberName: "A", allocation: 10_000, contributed: 10_000, pending: 0 };
    expect(quotaStatusLabel(status)).toBe("Aportada");
  });
});

describe("isValidContributionAmount", () => {
  it("accepts a positive finite amount", () => {
    expect(isValidContributionAmount(500)).toBe(true);
  });

  it("rejects zero, negative or NaN amounts", () => {
    expect(isValidContributionAmount(0)).toBe(false);
    expect(isValidContributionAmount(-10)).toBe(false);
    expect(isValidContributionAmount(NaN)).toBe(false);
  });
});
