import { describe, expect, it } from "vitest";
import {
  isValidContributionAmount,
  monthLabelEs,
  quotaStatusLabel,
  suggestedContributionAmount,
} from "./plata-money-fondo";

describe("monthLabelEs", () => {
  it("maps a YYYY-MM period to the Spanish month name", () => {
    expect(monthLabelEs("2026-11")).toBe("noviembre");
    expect(monthLabelEs("2026-01")).toBe("enero");
  });
});

describe("quotaStatusLabel", () => {
  it("is Pendiente when there's a pending amount", () => {
    expect(quotaStatusLabel({ memberId: "a", memberName: "Sofi", allocation: 100, contributed: 0, pending: 100 })).toBe(
      "Pendiente",
    );
  });

  it("is Aportada when fully paid or status is missing", () => {
    expect(
      quotaStatusLabel({ memberId: "a", memberName: "Sofi", allocation: 100, contributed: 100, pending: 0 }),
    ).toBe("Aportada");
    expect(quotaStatusLabel(undefined)).toBe("Aportada");
  });
});

describe("suggestedContributionAmount", () => {
  it("defaults to the pending quota", () => {
    expect(
      suggestedContributionAmount({ memberId: "a", memberName: "Sofi", allocation: 100, contributed: 0, pending: 40 }),
    ).toBe(40);
    expect(suggestedContributionAmount(undefined)).toBe(0);
  });
});

describe("isValidContributionAmount", () => {
  it("rejects zero, negative and non-finite amounts", () => {
    expect(isValidContributionAmount(0)).toBe(false);
    expect(isValidContributionAmount(-1)).toBe(false);
    expect(isValidContributionAmount(Number.NaN)).toBe(false);
  });

  it("accepts positive finite amounts", () => {
    expect(isValidContributionAmount(40)).toBe(true);
  });
});
