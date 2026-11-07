import { describe, expect, it } from "vitest";
import { splitEvenlyExact } from "@habita/domain";

import {
  buildExpenseDraft,
  buildExpensePayload,
  describeCustomSplit,
  dueDateToIsoStartOfDay,
  isFundToggleVisible,
  resolveChargeToFund,
  resolveMemberIdByName,
  summarizeCustomSplit,
} from "./anotar-draft-logic";
import type { MemberSummary } from "@habita/contracts";

const members: MemberSummary[] = [
  { id: "m-sofi", householdId: "h1", name: "Sofi", memberType: "ADULT", isActive: true },
  { id: "m-tomi", householdId: "h1", name: "Tomi", memberType: "ADULT", isActive: true },
  { id: "m-ana", householdId: "h1", name: "Ana", memberType: "ADULT", isActive: true },
];

describe("resolveMemberIdByName", () => {
  it("matches a member name case-insensitively", () => {
    expect(resolveMemberIdByName("sofi", members)).toBe("m-sofi");
  });

  it("returns null when no member matches", () => {
    expect(resolveMemberIdByName("Nadie", members)).toBeNull();
  });

  it("returns null for a null name", () => {
    expect(resolveMemberIdByName(null, members)).toBeNull();
  });
});

describe("dueDateToIsoStartOfDay", () => {
  it("rejects a malformed date", () => {
    expect(dueDateToIsoStartOfDay("not-a-date")).toBeNull();
  });

  it("converts a YYYY-MM-DD date to an ISO datetime", () => {
    expect(dueDateToIsoStartOfDay("2026-01-15")).toBe("2026-01-15T09:00:00.000Z");
  });
});

describe("splitEvenlyExact", () => {
  it("splits an amount that divides evenly", () => {
    expect(splitEvenlyExact(100, ["a", "b"])).toEqual([
      { memberId: "a", amount: 50 },
      { memberId: "b", amount: 50 },
    ]);
  });

  it("sums back exactly to the total when the amount does not divide evenly", () => {
    const shares = splitEvenlyExact(100, ["c", "a", "b"]);
    const total = shares.reduce((sum, share) => sum + share.amount, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it("returns an empty array for no participants", () => {
    expect(splitEvenlyExact(100, [])).toEqual([]);
  });
});

describe("buildExpenseDraft", () => {
  it("defaults the payer to the current member when the AI found none", () => {
    const draft = buildExpenseDraft(
      { title: "Luz", amount: 5000, category: "UTILITIES", paidByMemberId: null, splitWithMemberIds: [] },
      members,
      "m-sofi",
    );
    expect(draft.payerId).toBe("m-sofi");
  });

  it("defaults participants to every active member when the AI found no split-with", () => {
    const draft = buildExpenseDraft(
      { title: "Luz", amount: 5000, category: "UTILITIES", paidByMemberId: "m-sofi", splitWithMemberIds: [] },
      members,
      "m-sofi",
    );
    expect(draft.participantIds.sort()).toEqual(["m-ana", "m-sofi", "m-tomi"]);
  });

  it("includes the payer even when the AI's split-with omitted them", () => {
    const draft = buildExpenseDraft(
      { title: "Luz", amount: 5000, category: "UTILITIES", paidByMemberId: "m-sofi", splitWithMemberIds: ["m-tomi"] },
      members,
      "m-sofi",
    );
    expect(draft.participantIds.sort()).toEqual(["m-sofi", "m-tomi"]);
  });
});

describe("buildExpensePayload", () => {
  it("builds a CUSTOM payload whose splits sum to the amount for EQUAL", () => {
    const payload = buildExpensePayload(
      {
        title: "Luz",
        amount: 100,
        category: "UTILITIES",
        payerId: "m-sofi",
        participantIds: ["m-sofi", "m-tomi", "m-ana"],
        splitType: "EQUAL",
        customSplits: {},
        chargeToFund: null,
        notes: "",
      },
      false,
    );
    expect(payload.splitType).toBe("CUSTOM");
    const total = (payload.splits ?? []).reduce((sum, split) => sum + (split.amount ?? 0), 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it("honors the typed-in amounts for CUSTOM", () => {
    const payload = buildExpensePayload(
      {
        title: "Luz",
        amount: 100,
        category: "UTILITIES",
        payerId: "m-sofi",
        participantIds: ["m-sofi", "m-tomi"],
        splitType: "CUSTOM",
        customSplits: { "m-sofi": "60", "m-tomi": "40" },
        chargeToFund: null,
        notes: "",
      },
      false,
    );
    expect(payload.splits).toEqual([
      { memberId: "m-sofi", amount: 60 },
      { memberId: "m-tomi", amount: 40 },
    ]);
  });

  it("passes through notes and the resolved chargeToFund", () => {
    const payload = buildExpensePayload(
      {
        title: "Luz",
        amount: 100,
        category: "UTILITIES",
        payerId: "m-sofi",
        participantIds: ["m-sofi"],
        splitType: "EQUAL",
        customSplits: {},
        chargeToFund: true,
        notes: "Factura de enero",
      },
      true,
    );
    expect(payload.chargeToFund).toBe(true);
    expect(payload.notes).toBe("Factura de enero");
  });
});

describe("resolveChargeToFund", () => {
  it("is false when the toggle isn't visible, regardless of the user's choice", () => {
    expect(resolveChargeToFund(null, false)).toBe(false);
    expect(resolveChargeToFund(true, false)).toBe(false);
    expect(resolveChargeToFund(false, false)).toBe(false);
  });

  it("defaults to true when visible and the user hasn't touched it", () => {
    expect(resolveChargeToFund(null, true)).toBe(true);
  });

  it("honors an explicit true when visible", () => {
    expect(resolveChargeToFund(true, true)).toBe(true);
  });

  it("honors an explicit false when visible", () => {
    expect(resolveChargeToFund(false, true)).toBe(false);
  });
});

describe("summarizeCustomSplit", () => {
  it("reports balanced when the custom amounts sum to the total", () => {
    const summary = summarizeCustomSplit(100, { a: "60", b: "40" }, ["a", "b"]);
    expect(summary.isBalanced).toBe(true);
    expect(summary.remaining).toBe(0);
  });

  it("reports remaining to assign when under the total", () => {
    const summary = summarizeCustomSplit(100, { a: "30" }, ["a", "b"]);
    expect(summary.isBalanced).toBe(false);
    expect(summary.isOver).toBe(false);
    expect(summary.remaining).toBe(70);
  });

  it("reports over when the custom amounts exceed the total", () => {
    const summary = summarizeCustomSplit(100, { a: "70", b: "50" }, ["a", "b"]);
    expect(summary.isOver).toBe(true);
    expect(summary.remaining).toBe(-20);
  });
});

describe("isFundToggleVisible", () => {
  it("is hidden when there is no fund", () => {
    expect(isFundToggleVisible(null, "GROCERIES")).toBe(false);
  });

  it("is hidden when the fund is inactive", () => {
    expect(isFundToggleVisible({ isActive: false, fundCategories: ["GROCERIES"] }, "GROCERIES")).toBe(false);
  });

  it("is hidden when the category isn't covered by the fund", () => {
    expect(isFundToggleVisible({ isActive: true, fundCategories: ["GROCERIES"] }, "FOOD")).toBe(false);
  });

  it("is visible when the fund is active and covers the category", () => {
    expect(isFundToggleVisible({ isActive: true, fundCategories: ["GROCERIES"] }, "GROCERIES")).toBe(true);
  });
});

describe("describeCustomSplit", () => {
  it("says how much is over when the amounts exceed the total", () => {
    expect(describeCustomSplit(summarizeCustomSplit(100, { a: "80", b: "40" }, ["a", "b"]))).toEqual({ tone: "over", label: "$20 de más" });
  });

  it("says how much is still unassigned", () => {
    expect(describeCustomSplit(summarizeCustomSplit(1500, { a: "500" }, ["a", "b"]))).toEqual({ tone: "under", label: "$1.000 por asignar" });
  });
});
