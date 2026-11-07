import { describe, expect, it } from "vitest";
import {
  findMemberNet,
  formatCurrencyArs,
  isMigratedSettlement,
  isSettledUp,
  netStatus,
  settlementRowLabel,
  transactionRowLabel,
} from "./plata-money-saldos";

describe("formatCurrencyArs", () => {
  it("formats without decimals and with es-AR grouping", () => {
    expect(formatCurrencyArs(9300)).toBe("$9.300");
    expect(formatCurrencyArs(-9300)).toBe("$9.300");
  });
});

describe("netStatus", () => {
  it("returns the all-settled label at zero", () => {
    expect(netStatus(0)).toEqual({ sign: "zero", label: "$0 · Están al día" });
  });

  it("prefixes positive amounts with +", () => {
    expect(netStatus(9300)).toEqual({ sign: "positive", label: "+$9.300" });
  });

  it("prefixes negative amounts with −", () => {
    expect(netStatus(-9300)).toEqual({ sign: "negative", label: "−$9.300" });
  });
});

describe("findMemberNet", () => {
  it("returns the member's balance", () => {
    const balances = [{ memberId: "a", memberName: "Sofi", balance: 100 }];
    expect(findMemberNet(balances, "a")).toBe(100);
  });

  it("defaults to 0 when the member has no balance row", () => {
    expect(findMemberNet([], "a")).toBe(0);
  });
});

describe("isSettledUp", () => {
  it("is true only when every balance is 0", () => {
    expect(isSettledUp([{ memberId: "a", memberName: "Sofi", balance: 0 }])).toBe(true);
    expect(isSettledUp([{ memberId: "a", memberName: "Sofi", balance: 10 }])).toBe(false);
  });
});

describe("transactionRowLabel", () => {
  const transaction = {
    fromMemberId: "me",
    fromMemberName: "Vos",
    toMemberId: "sofi",
    toMemberName: "Sofi",
    amount: 100,
  };

  it("replaces the current member with Vos on either side", () => {
    expect(transactionRowLabel(transaction, "me")).toBe("Vos → Sofi");
    expect(transactionRowLabel(transaction, "sofi")).toBe("Vos → Vos");
  });
});

describe("isMigratedSettlement", () => {
  it("matches only the exact migration note", () => {
    expect(isMigratedSettlement("Migrado desde liquidaciones anteriores")).toBe(true);
    expect(isMigratedSettlement("otra nota")).toBe(false);
    expect(isMigratedSettlement(null)).toBe(false);
  });
});

describe("settlementRowLabel", () => {
  it("uses second person when the current member paid", () => {
    const settlement = { fromMemberId: "me", fromMemberName: "Vos", toMemberId: "sofi", toMemberName: "Sofi" };
    expect(settlementRowLabel(settlement, "me")).toBe("Vos le pagaste a Sofi");
  });

  it("uses third person when someone else paid", () => {
    const settlement = { fromMemberId: "sofi", fromMemberName: "Sofi", toMemberId: "me", toMemberName: "Vos" };
    expect(settlementRowLabel(settlement, "me")).toBe("Sofi le pagó a Vos");
  });
});
