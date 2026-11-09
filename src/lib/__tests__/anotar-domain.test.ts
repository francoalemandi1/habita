import { describe, expect, it } from "vitest";

import {
  computeEqualShare,
  describeExpenseConsequence,
  extractExpenseHintFromText,
  formatExpenseConsequence,
  isSlotAvailable,
  normalizeAvailabilityGrid,
  toggleAvailabilitySlot,
} from "@habita/domain";

const names = new Map([
  ["me", "Franco"],
  ["sofi", "Sofi"],
  ["tomi", "Tomi"],
]);
const formatAmount = (amount: number): string => `$${amount}`;

describe("describeExpenseConsequence", () => {
  it("tells me what I owe when someone else paid", () => {
    const consequence = describeExpenseConsequence({
      amount: 300,
      payerMemberId: "sofi",
      participantMemberIds: ["me", "sofi", "tomi"],
      currentMemberId: "me",
      nameByMemberId: names,
    });
    expect(formatExpenseConsequence(consequence, formatAmount)).toBe("Le vas a deber $100 a Sofi");
  });

  it("lists who owes me when I paid", () => {
    const consequence = describeExpenseConsequence({
      amount: 300,
      payerMemberId: "me",
      participantMemberIds: ["me", "sofi", "tomi"],
      currentMemberId: "me",
      nameByMemberId: names,
    });
    expect(formatExpenseConsequence(consequence, formatAmount)).toBe("Sofi y Tomi te van a deber $100");
  });

  it("returns none when I am not part of someone else's expense", () => {
    const consequence = describeExpenseConsequence({
      amount: 300,
      payerMemberId: "sofi",
      participantMemberIds: ["sofi", "tomi"],
      currentMemberId: "me",
      nameByMemberId: names,
    });
    expect(consequence.kind).toBe("none");
  });

  it("rounds the equal share to cents", () => {
    expect(computeEqualShare(100, 3)).toBe(33.33);
  });
});

describe("extractExpenseHintFromText", () => {
  it("strips the payment verb, connector and split phrase", () => {
    expect(extractExpenseHintFromText("Pagué 12000 de verdulería entre los dos")).toEqual({
      title: "Verdulería",
      amount: 12000,
    });
  });

  it("parses a dotted-thousands amount with a $ prefix", () => {
    expect(extractExpenseHintFromText("super $15.500")).toEqual({ title: "Super", amount: 15500 });
  });

  it("parses a 'k' suffix amount", () => {
    expect(extractExpenseHintFromText("gasté 3k en nafta")).toEqual({ title: "Nafta", amount: 3000 });
  });

  it("parses a 'mil' suffix amount", () => {
    expect(extractExpenseHintFromText("luz 25 mil")).toEqual({ title: "Luz", amount: 25000 });
  });

  it("falls back to the original text when there is no amount", () => {
    expect(extractExpenseHintFromText("comprar pan")).toEqual({ title: "Comprar pan", amount: null });
  });

  it("parses a dotted-thousands amount with decimal cents", () => {
    expect(extractExpenseHintFromText("Expensas 58.400,50")).toEqual({ title: "Expensas", amount: 58400.5 });
  });
});

describe("availability grid", () => {
  it("treats a null grid as available everywhere", () => {
    expect(isSlotAvailable(null, 3, "evening")).toBe(true);
  });

  it("toggles one slot off and back on, keeping slot order", () => {
    const off = toggleAvailabilitySlot(null, 6, "morning");
    expect(off["6"]).toEqual(["afternoon", "evening"]);
    expect(toggleAvailabilitySlot(off, 6, "morning")["6"]).toEqual(["morning", "afternoon", "evening"]);
  });

  it("normalizes a fully available grid back to null", () => {
    const roundTrip = toggleAvailabilitySlot(toggleAvailabilitySlot(null, 2, "evening"), 2, "evening");
    expect(normalizeAvailabilityGrid(roundTrip)).toBeNull();
  });
});
