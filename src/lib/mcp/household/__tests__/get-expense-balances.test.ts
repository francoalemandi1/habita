import { afterEach, describe, expect, it, vi } from "vitest";

const { getHouseholdBalancesMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  getHouseholdBalancesMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/expense-balances", () => ({ getHouseholdBalances: getHouseholdBalancesMock }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleGetExpenseBalances } from "../tools/get-expense-balances";

const identity = { userId: "user-1", scopes: new Set(["habita"]) };
const member = { id: "member-1", householdId: "house-a" };

describe("handleGetExpenseBalances", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("computes balances for the resolved member's householdId", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    getHouseholdBalancesMock.mockResolvedValue({ byCurrency: {}, primaryCurrency: "ARS" });

    const result = await handleGetExpenseBalances(identity, {});

    expect(result.isError).toBeFalsy();
    expect(getHouseholdBalancesMock).toHaveBeenCalledWith("house-a");
  });

  it("returns an error result without computing balances when resolution fails", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "no_household" });

    const result = await handleGetExpenseBalances(identity, {});

    expect(result.isError).toBe(true);
    expect(getHouseholdBalancesMock).not.toHaveBeenCalled();
  });
});
