import { describe, expect, it } from "vitest";
import {
  findMemberNet,
  formatCurrencyArs,
  isSettledUp,
  netStatus,
  settlementRowLabel,
  transactionRowLabel,
} from "@/components/features/plata/saldos/saldos-logic";

describe("formatCurrencyArs", () => {
  it("formats with es-AR thousands grouping, no decimals", () => {
    expect(formatCurrencyArs(9300)).toBe("$9.300");
  });

  it("rounds and drops the sign — callers prefix +/−", () => {
    expect(formatCurrencyArs(-9300.4)).toBe("$9.300");
  });
});

describe("netStatus", () => {
  it("prefixes + for a positive net", () => {
    expect(netStatus(9300)).toEqual({ sign: "positive", formattedAmount: "$9.300", label: "+$9.300" });
  });

  it("prefixes − for a negative net", () => {
    expect(netStatus(-9300)).toEqual({ sign: "negative", formattedAmount: "$9.300", label: "−$9.300" });
  });

  it("reads 'Están al día' at zero", () => {
    expect(netStatus(0)).toEqual({ sign: "zero", formattedAmount: "$0", label: "$0 · Están al día" });
  });
});

describe("findMemberNet", () => {
  it("returns the member's balance when present", () => {
    expect(findMemberNet([{ memberId: "vos", memberName: "Vos", balance: 100 }], "vos")).toBe(100);
  });

  it("defaults to 0 when the member has no balance row", () => {
    expect(findMemberNet([], "vos")).toBe(0);
  });
});

describe("isSettledUp", () => {
  it("is true when every balance is zero", () => {
    expect(isSettledUp([{ memberId: "a", memberName: "A", balance: 0 }])).toBe(true);
  });

  it("is false when any balance is non-zero", () => {
    expect(isSettledUp([{ memberId: "a", memberName: "A", balance: 10 }])).toBe(false);
  });
});

describe("transactionRowLabel", () => {
  const transaction = { fromMemberId: "vos", fromMemberName: "Franco", toMemberId: "sofi", toMemberName: "Sofi", amount: 100 };

  it("addresses the current member as the one who owes", () => {
    expect(transactionRowLabel(transaction, "vos")).toBe("Le debés a Sofi");
  });

  it("addresses the current member as the one who is owed", () => {
    expect(transactionRowLabel(transaction, "sofi")).toBe("Franco te debe");
  });

  it("names both members when the current member is not involved", () => {
    expect(transactionRowLabel(transaction, "tomi")).toBe("Franco le debe a Sofi");
  });
});

describe("settlementRowLabel", () => {
  const settlement = { fromMemberId: "tomi", fromMemberName: "Tomi", toMemberId: "vos", toMemberName: "Franco" };

  it("reads 'X te pagó' when the current member received the payment", () => {
    expect(settlementRowLabel(settlement, "vos")).toBe("Tomi te pagó");
  });

  it("reads 'Le pagaste a X' when the current member paid", () => {
    expect(settlementRowLabel(settlement, "tomi")).toBe("Le pagaste a Franco");
  });

  it("names both members when the current member is not involved", () => {
    expect(settlementRowLabel(settlement, "sofi")).toBe("Tomi le pagó a Franco");
  });
});

