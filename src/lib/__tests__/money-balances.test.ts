import { describe, expect, it } from "vitest";

import {
  computeBalancesByCurrency,
  simplifyDebts,
  type MemberBalance,
  type MoneyMember,
} from "../../../packages/domain/src/money-balances";

const members: MoneyMember[] = [
  { id: "tomi", name: "Tomi" },
  { id: "vos", name: "Vos" },
  { id: "sofi", name: "Sofi" },
];

describe("computeBalancesByCurrency", () => {
  it("splits an expense equally among members", () => {
    const result = computeBalancesByCurrency({
      members,
      splits: [
        { memberId: "tomi", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "vos", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "sofi", payerId: "tomi", amount: 100, currency: "ARS" },
      ],
      settlements: [],
    });

    expect(byMember(result.ARS)).toEqual({ tomi: 200, vos: -100, sofi: -100 });
  });

  it("reduces the debtor's balance after a partial settlement", () => {
    const result = computeBalancesByCurrency({
      members,
      splits: [
        { memberId: "tomi", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "vos", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "sofi", payerId: "tomi", amount: 100, currency: "ARS" },
      ],
      settlements: [{ fromMemberId: "vos", toMemberId: "tomi", amount: 50, currency: "ARS" }],
    });

    expect(byMember(result.ARS)).toEqual({ tomi: 150, vos: -50, sofi: -100 });
  });

  it("zeroes out a debtor after a full settlement", () => {
    const result = computeBalancesByCurrency({
      members,
      splits: [
        { memberId: "tomi", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "vos", payerId: "tomi", amount: 100, currency: "ARS" },
      ],
      settlements: [{ fromMemberId: "vos", toMemberId: "tomi", amount: 100, currency: "ARS" }],
    });

    expect(byMember(result.ARS).vos).toBe(0);
  });

  it("flips the sign on an over-settlement", () => {
    const result = computeBalancesByCurrency({
      members,
      splits: [
        { memberId: "tomi", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "vos", payerId: "tomi", amount: 100, currency: "ARS" },
      ],
      settlements: [{ fromMemberId: "vos", toMemberId: "tomi", amount: 150, currency: "ARS" }],
    });

    expect(byMember(result.ARS).vos).toBe(50);
  });

  it("keeps currencies separate", () => {
    const result = computeBalancesByCurrency({
      members,
      splits: [
        { memberId: "tomi", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "vos", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "tomi", payerId: "tomi", amount: 10, currency: "USD" },
        { memberId: "sofi", payerId: "tomi", amount: 10, currency: "USD" },
      ],
      settlements: [],
    });

    expect(byMember(result.ARS)).toEqual({ tomi: 100, vos: -100, sofi: 0 });
    expect(byMember(result.USD)).toEqual({ tomi: 10, vos: 0, sofi: -10 });
  });

  it("sums to zero even with rounding splits across three members", () => {
    const result = computeBalancesByCurrency({
      members,
      splits: [
        { memberId: "tomi", payerId: "tomi", amount: "33.34", currency: "ARS" },
        { memberId: "vos", payerId: "tomi", amount: "33.33", currency: "ARS" },
        { memberId: "sofi", payerId: "tomi", amount: "33.33", currency: "ARS" },
      ],
      settlements: [],
    });

    const total = result.ARS!.reduce((sum, balance) => sum + balance.balance, 0);
    expect(total).toBe(0);
  });
});

describe("simplifyDebts regression: Tomi 300 (3-way) + Vos 150 (2-way)", () => {
  const balances: MemberBalance[] = [
    { memberId: "tomi", memberName: "Tomi", balance: 200 },
    { memberId: "vos", memberName: "Vos", balance: -25 },
    { memberId: "sofi", memberName: "Sofi", balance: -175 },
  ];

  it("produces Sofi->Tomi 175 and Vos->Tomi 25", () => {
    const transactions = simplifyDebts(balances);

    expect(transactions).toEqual([
      { fromMemberId: "sofi", fromMemberName: "Sofi", toMemberId: "tomi", toMemberName: "Tomi", amount: 175 },
      { fromMemberId: "vos", fromMemberName: "Vos", toMemberId: "tomi", toMemberName: "Tomi", amount: 25 },
    ]);
  });

  it("after settling Vos->Tomi 25, Vos is exactly zero and Sofi->Tomi 175 remains", () => {
    const result = computeBalancesByCurrency({
      members,
      splits: [
        { memberId: "tomi", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "vos", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "sofi", payerId: "tomi", amount: 100, currency: "ARS" },
        { memberId: "vos", payerId: "vos", amount: 75, currency: "ARS" },
        { memberId: "sofi", payerId: "vos", amount: 75, currency: "ARS" },
      ],
      settlements: [{ fromMemberId: "vos", toMemberId: "tomi", amount: 25, currency: "ARS" }],
    });

    expect(byMember(result.ARS)).toEqual({ tomi: 175, vos: 0, sofi: -175 });
    expect(simplifyDebts(result.ARS!)).toEqual([
      { fromMemberId: "sofi", fromMemberName: "Sofi", toMemberId: "tomi", toMemberName: "Tomi", amount: 175 },
    ]);
  });
});

describe("simplifyDebts determinism", () => {
  it("breaks ties by amount desc then memberId asc", () => {
    const tied: MemberBalance[] = [
      { memberId: "zeta", memberName: "Zeta", balance: 100 },
      { memberId: "alfa", memberName: "Alfa", balance: 100 },
      { memberId: "gamma", memberName: "Gamma", balance: -100 },
      { memberId: "beta", memberName: "Beta", balance: -100 },
    ];

    expect(simplifyDebts(tied)).toEqual([
      { fromMemberId: "beta", fromMemberName: "Beta", toMemberId: "alfa", toMemberName: "Alfa", amount: 100 },
      { fromMemberId: "gamma", fromMemberName: "Gamma", toMemberId: "zeta", toMemberName: "Zeta", amount: 100 },
    ]);
  });
});

function byMember(balances: MemberBalance[] | undefined): Record<string, number> {
  const entries = (balances ?? []).map((balance) => [balance.memberId, balance.balance] as const);
  return Object.fromEntries(entries);
}
