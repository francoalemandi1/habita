import { describe, expect, it } from "vitest";
import { buildExpenseDraftFromParsed } from "@/components/features/anotar/anotar-draft-types";

import type { ParsedExpenseEntry } from "@habita/contracts";

const members = [
  { id: "m1", name: "Sofi", memberType: "ADULT" as const, isActive: true, householdId: "h1" },
  { id: "m2", name: "Tomi", memberType: "ADULT" as const, isActive: true, householdId: "h1" },
  { id: "m3", name: "Lu", memberType: "ADULT" as const, isActive: true, householdId: "h1" },
];

function parsedExpense(overrides: Partial<ParsedExpenseEntry>): ParsedExpenseEntry {
  return {
    title: "Super",
    amount: 1000,
    currency: "ARS",
    category: "OTHER",
    paidByName: null,
    paidByMemberId: null,
    splitWithNames: [],
    splitWithMemberIds: [],
    date: null,
    notes: null,
    ...overrides,
  };
}

describe("buildExpenseDraftFromParsed", () => {
  it("defaults to every active member when no split-with was parsed", () => {
    const draft = buildExpenseDraftFromParsed(parsedExpense({}), members, "m1");
    expect(draft.participantIds.sort()).toEqual(["m1", "m2", "m3"]);
  });

  it("defaults the payer to the current member when none was parsed", () => {
    const draft = buildExpenseDraftFromParsed(parsedExpense({}), members, "m1");
    expect(draft.payerId).toBe("m1");
  });

  it("uses the parsed payer and includes them in the split even if not explicitly listed", () => {
    const draft = buildExpenseDraftFromParsed(
      parsedExpense({ paidByMemberId: "m2", splitWithMemberIds: ["m3"] }),
      members,
      "m1",
    );
    expect(draft.payerId).toBe("m2");
    expect(draft.participantIds.sort()).toEqual(["m2", "m3"]);
  });

  it("falls back to today when no date was parsed", () => {
    const draft = buildExpenseDraftFromParsed(parsedExpense({}), members, "m1");
    expect(draft.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
