import { describe, expect, it } from "vitest";

import { buildDebtCallout } from "@/components/features/plata/expense-detail/expense-detail-logic";

describe("buildDebtCallout", () => {
  it("tells the current member what they owe when they didn't pay", () => {
    const callout = buildDebtCallout({
      currentMemberId: "me",
      paidById: "sofi",
      paidByName: "Sofi",
      splits: [
        { memberId: "me", memberName: "Vos", amount: 16_107 },
        { memberId: "sofi", memberName: "Sofi", amount: 16_107 },
      ],
    });

    expect(callout).toEqual({ tone: "ladrillo-soft", text: "Por este gasto le debés $16.107 a Sofi" });
  });

  it("tells the current member what they're owed when they paid", () => {
    const callout = buildDebtCallout({
      currentMemberId: "me",
      paidById: "me",
      paidByName: "Vos",
      splits: [
        { memberId: "me", memberName: "Vos", amount: 16_107 },
        { memberId: "sofi", memberName: "Sofi", amount: 16_107 },
      ],
    });

    expect(callout).toEqual({ tone: "monte-soft", text: "Por este gasto Sofi te debe $16.107" });
  });

  it("picks the largest debt among several other members", () => {
    const callout = buildDebtCallout({
      currentMemberId: "me",
      paidById: "me",
      paidByName: "Vos",
      splits: [
        { memberId: "me", memberName: "Vos", amount: 10_000 },
        { memberId: "sofi", memberName: "Sofi", amount: 5_000 },
        { memberId: "tomi", memberName: "Tomi", amount: 15_000 },
      ],
    });

    expect(callout?.text).toBe("Por este gasto Tomi te debe $15.000");
  });

  it("is omitted for a personal expense with only your own share", () => {
    const callout = buildDebtCallout({
      currentMemberId: "me",
      paidById: "me",
      paidByName: "Vos",
      splits: [{ memberId: "me", memberName: "Vos", amount: 5_000 }],
    });

    expect(callout).toBeNull();
  });

  it("is omitted when the current member isn't part of the split", () => {
    const callout = buildDebtCallout({
      currentMemberId: "me",
      paidById: "sofi",
      paidByName: "Sofi",
      splits: [
        { memberId: "sofi", memberName: "Sofi", amount: 5_000 },
        { memberId: "tomi", memberName: "Tomi", amount: 5_000 },
      ],
    });

    expect(callout).toBeNull();
  });
});
