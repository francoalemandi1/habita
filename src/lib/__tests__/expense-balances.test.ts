import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryRawMock, memberFindManyMock, groupByMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  groupByMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: queryRawMock,
    member: { findMany: memberFindManyMock },
    expense: { groupBy: groupByMock },
  },
}));

import { getHouseholdBalances } from "../expense-balances";

describe("getHouseholdBalances", () => {
  beforeEach(() => {
    memberFindManyMock.mockResolvedValue([
      { id: "tomi", name: "Tomi" },
      { id: "vos", name: "Vos" },
      { id: "sofi", name: "Sofi" },
    ]);
    groupByMock.mockResolvedValue([{ currency: "ARS", _count: { _all: 2 } }]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("nets split aggregates into balances and a simplified transaction list", async () => {
    queryRawMock
      .mockResolvedValueOnce([
        { memberId: "vos", payerId: "tomi", currency: "ARS", totalAmount: "100" },
        { memberId: "sofi", payerId: "tomi", currency: "ARS", totalAmount: "100" },
        { memberId: "sofi", payerId: "vos", currency: "ARS", totalAmount: "75" },
      ])
      .mockResolvedValueOnce([]);

    const result = await getHouseholdBalances("household-1");

    expect(result.primaryCurrency).toBe("ARS");
    const byMember = Object.fromEntries(result.byCurrency.ARS!.balances.map((b) => [b.memberId, b.balance]));
    expect(byMember).toEqual({ tomi: 200, vos: -25, sofi: -175 });
    expect(result.byCurrency.ARS!.transactions).toEqual([
      { fromMemberId: "sofi", fromMemberName: "Sofi", toMemberId: "tomi", toMemberName: "Tomi", amount: 175 },
      { fromMemberId: "vos", fromMemberName: "Vos", toMemberId: "tomi", toMemberName: "Tomi", amount: 25 },
    ]);
  });

  it("reduces balances once a settlement has been recorded", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ memberId: "vos", payerId: "tomi", currency: "ARS", totalAmount: "100" }])
      .mockResolvedValueOnce([{ fromMemberId: "vos", toMemberId: "tomi", currency: "ARS", totalAmount: "100" }]);

    const result = await getHouseholdBalances("household-1");

    const byMember = Object.fromEntries(result.byCurrency.ARS!.balances.map((b) => [b.memberId, b.balance]));
    expect(byMember.vos).toBe(0);
    expect(byMember.tomi).toBe(0);
    expect(result.byCurrency.ARS!.transactions).toEqual([]);
  });
});
