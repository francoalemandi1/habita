import { describe, expect, it } from "vitest";
import { splitEvenlyExact } from "@habita/domain";

import {
  buildExpenseDraft,
  buildExpensePayload,
  dueDateToIsoStartOfDay,
  resolveMemberIdByName,
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
  it("builds a CUSTOM payload whose splits sum to the amount", () => {
    const payload = buildExpensePayload({
      title: "Luz",
      amount: 100,
      category: "UTILITIES",
      payerId: "m-sofi",
      participantIds: ["m-sofi", "m-tomi", "m-ana"],
    });
    expect(payload.splitType).toBe("CUSTOM");
    const total = (payload.splits ?? []).reduce((sum, split) => sum + (split.amount ?? 0), 0);
    expect(total).toBeCloseTo(100, 5);
  });
});
